import { app, BrowserWindow, ipcMain } from 'electron';
import dgram from 'node:dgram';
import path from 'node:path';
import fs from 'node:fs';
import { parseUdpMessage } from './utils/parsers';

let mainWindow: BrowserWindow | null = null;
let promptWindow: BrowserWindow | null = null;
let udpSocket: dgram.Socket | null = null;
let latestNodes: Array<any> = [];
let opcode101Members: Map<number, any> = new Map();
let latestTargets: Array<any> = [];
let latestEngagements: Array<any> = [];
let latestThreats: Array<any> = [];
let lastUdpMessageTime: number | null = null;
let staleCheckInterval: NodeJS.Timeout | null = null;
const STALE_UDP_TIMEOUT_MS = 5000; // Clear data if no UDP messages for 5 seconds

// Read config.json from executable directory
function readConfigJson(): { ip?: string; port?: string } | null {
  try {
    const exeDir = path.dirname(process.execPath);
    const configPath = path.join(exeDir, 'config.json');
    
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // Validate format - must have ip and port keys
      if (config && typeof config === 'object' && 'ip' in config && 'port' in config) {
        return {
          ip: String(config.ip),
          port: String(config.port),
        };
      }
    }
  } catch (error) {
    // Silently fail if config.json doesn't exist or is invalid
    console.warn('[Config] Failed to read config.json:', error);
  }
  
  return null;
}

function promptForUdpConfig(): Promise<{ host: string; port: number }> {
  return new Promise((resolve, reject) => {
    if (promptWindow) {
      promptWindow.focus();
      return;
    }

    // Read config.json for default values
    const config = readConfigJson();
    const defaultHost = config?.ip || '127.0.0.1';
    const defaultPort = config?.port || '5005';

    promptWindow = new BrowserWindow({
      width: 420,
      height: 350,
      resizable: false,
      title: 'UDP Configuration',
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    promptWindow.removeMenu();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #0f172a;
              color: #e2e8f0;
              display: flex;
              flex-direction: column;
            }
            h1 {
              margin: 0 0 8px 0;
              font-size: 18px;
            }
            p {
              margin: 0 0 16px 0;
              font-size: 13px;
              color: #94a3b8;
            }
            form {
              display: flex;
              flex-direction: column;
              min-height: 0;
            }
            label {
              display: block;
              margin-top: 12px;
              font-weight: 600;
              font-size: 13px;
            }
            input {
              width: 100%;
              padding: 8px;
              margin-top: 4px;
              border-radius: 4px;
              border: 1px solid #334155;
              background: #1e293b;
              color: #e2e8f0;
              font-size: 13px;
            }
            .actions {
              margin-top: 24px;
              padding-top: 20px;
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              flex-shrink: 0;
            }
            button {
              padding: 10px 20px;
              border-radius: 4px;
              border: none;
              cursor: pointer;
              font-weight: 600;
              font-size: 14px;
            }
            .primary {
              background: #2563eb;
              color: white;
            }
            .primary:hover {
              background: #1d4ed8;
            }
          </style>
        </head>
        <body>
          <h1>UDP Server Configuration</h1>
          <p>Enter the UDP server address and port to connect.</p>
          <form id="udp-config-form">
            <label>
              Host
              <input type="text" id="udp-host" value="${defaultHost}" required />
            </label>
            <label>
              Port
              <input type="number" id="udp-port" value="${defaultPort}" min="1" max="65535" required />
            </label>
            <div class="actions">
              <button type="submit" class="primary">Connect</button>
            </div>
          </form>
          <script>
            const { ipcRenderer } = require('electron');
            const form = document.getElementById('udp-config-form');
            const hostInput = document.getElementById('udp-host');
            const portInput = document.getElementById('udp-port');

            form.addEventListener('submit', (event) => {
              event.preventDefault();
              const host = hostInput.value.trim();
              const port = parseInt(portInput.value, 10);
              if (!host || Number.isNaN(port) || port < 1 || port > 65535) {
                alert('Please provide a valid host and port (1-65535).');
                return;
              }
              ipcRenderer.send('udp-config-submitted', { host, port });
            });
          </script>
        </body>
      </html>
    `;

    promptWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    );

    promptWindow.once('ready-to-show', () => {
      promptWindow?.show();
    });

    let handled = false;

    const cleanup = () => {
      ipcMain.removeAllListeners('udp-config-submitted');
      ipcMain.removeAllListeners('udp-config-cancelled');
    };

    const closePrompt = () => {
      if (promptWindow) {
        const win = promptWindow;
        promptWindow = null;
        win.close();
      }
    };

    promptWindow.on('closed', () => {
      cleanup();
      if (!handled) {
        reject(new Error('UDP configuration window was closed'));
      }
      promptWindow = null;
    });

    ipcMain.once('udp-config-submitted', (_event, data) => {
      handled = true;
      cleanup();
      closePrompt();
      resolve({ host: data.host, port: Number(data.port) });
    });

    ipcMain.once('udp-config-cancelled', () => {
      handled = true;
      cleanup();
      closePrompt();
      reject(new Error('UDP configuration cancelled'));
    });
  });
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
    },
  });

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

function setupUdpClient(host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Clear stale check interval if it exists
      if (staleCheckInterval) {
        clearInterval(staleCheckInterval);
        staleCheckInterval = null;
      }
      
      // Clear all stale data when setting up new UDP connection
      opcode101Members.clear();
      latestNodes = [];
      latestTargets = [];
      latestEngagements = [];
      latestThreats = [];
      lastUdpMessageTime = null;
      
      // Clear/override the UDP log file when starting new UDP connection
      if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        try {
          const exeDir = path.dirname(process.execPath);
          const logFilePath = path.join(exeDir, 'udp_raw_buffer.log');
          fs.writeFileSync(logFilePath, '', 'utf8'); // Overwrite/create empty file
        } catch (error) {
          console.error('[UDP] Failed to clear log file:', error);
        }
      }
      
      console.log(`[UDP] Setting up client on ${host}:${port}`);
      udpSocket = dgram.createSocket('udp4');

      udpSocket.on('error', (err) => {
        console.error('[UDP] error:', err);
        reject(err);
      });

      udpSocket.on('message', (msg) => {
        // Update last message time
        lastUdpMessageTime = Date.now();
        
        // Log raw buffer to text file (only in production/exe mode)
        if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
          try {
            // Get the directory where the executable is located
            const exeDir = path.dirname(process.execPath);
            const logFilePath = path.join(exeDir, 'udp_raw_buffer.log');
            
            // Convert buffer to hex string for readability
            const hexString = Array.from(msg)
              .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
              .join(' ');
            
            // Append to file with timestamp
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] Opcode: ${msg[1]} | Length: ${msg.length} bytes | Hex: ${hexString}\n`;
            
            fs.appendFileSync(logFilePath, logEntry, 'utf8');
          } catch (error) {
            // Silently fail if file writing fails (e.g., permissions issue)
            console.error('[UDP] Failed to write buffer to log file:', error);
          }
        }
        
        // Convert message to binary string for bit operations (used by opcode 101)
        const isAsciiBinary = msg.every((byte) => byte === 48 || byte === 49);
        const bin = isAsciiBinary
          ? msg.toString('utf8').trim()
          : Array.from(msg)
              .map((b) => b.toString(2).padStart(8, '0'))
              .join('');

        const result = parseUdpMessage(msg, bin);
        
        if (!result) {
          return; // Unknown opcode
        }

        const { opcode, data } = result;

        if (opcode === 101) {
          // Only keep members that are in the current packet - remove stale ones
          // Create a set of current member IDs
          const currentMemberIds = new Set(data.map(m => m.globalId));
          
          // Remove members that are no longer in the current packet
          for (const [id] of opcode101Members) {
            if (!currentMemberIds.has(id)) {
              opcode101Members.delete(id);
            }
          }
          
          // Update/add members from current packet
          for (const member of data) {
            opcode101Members.set(member.globalId, member);
          }
          
          const allMembers = Array.from(opcode101Members.values());
          latestNodes = allMembers;
          sendToRenderer(allMembers);
        } else if (opcode === 102) {
          // Opcode 102 completely replaces the node list - this removes nodes not in current packet
          // Also, if a node appears in opcode 101 but not in opcode 102, it should lose mother node status
          const opcode102Ids = new Set(data.map(m => m.globalId));
          
          // Update opcode 101 members: remove mother node status if not in opcode 102
          for (const [id, member] of opcode101Members) {
            if (!opcode102Ids.has(id)) {
              // Node exists in 101 but not in 102 - clear mother node status
              if (member.internalData) {
                member.internalData.isMotherAc = 0;
              }
            }
          }
          
          latestNodes = data;
          sendToRenderer(data);
        } else if (opcode === 103) {
          latestEngagements = data;
          sendEngagementsToRenderer(data);
        } else if (opcode === 104) {
          latestTargets = data;
          sendTargetsToRenderer(data);
        } else if (opcode === 106) {
          latestThreats = data;
          sendThreatsToRenderer(data);
        }
      });

      udpSocket.bind(port, () => {
        udpSocket?.setBroadcast(true);
        
        // Start stale data check interval
        if (staleCheckInterval) {
          clearInterval(staleCheckInterval);
        }
        
        staleCheckInterval = setInterval(() => {
          if (lastUdpMessageTime === null) return;
          
          const now = Date.now();
          if (now - lastUdpMessageTime > STALE_UDP_TIMEOUT_MS) {
            // UDP has stopped - clear all data
            console.log('[UDP] No messages received for', STALE_UDP_TIMEOUT_MS, 'ms - clearing stale data');
            lastUdpMessageTime = null;
            opcode101Members.clear();
            latestNodes = [];
            latestTargets = [];
            latestEngagements = [];
            latestThreats = [];
            
            // Notify renderer that data has been cleared
            sendToRenderer([]);
            sendTargetsToRenderer([]);
            sendEngagementsToRenderer([]);
            sendThreatsToRenderer([]);
          }
        }, 1000); // Check every second
        
        resolve();
      });
    } catch (e) {
      console.error('[UDP] setup failed:', e);
      reject(e);
    }
  });
}

function sendToRenderer(data: any[]): void {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach((window) => {
    window.webContents.send('data-from-main', data);
  });
}

function sendTargetsToRenderer(data: any[]): void {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach((window) => {
    window.webContents.send('targets-from-main', data);
  });
}

function sendEngagementsToRenderer(data: any[]): void {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach((window) => {
    window.webContents.send('engagements-from-main', data);
  });
}

function sendThreatsToRenderer(data: any[]): void {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach((window) => {
    window.webContents.send('threats-from-main', data);
  });
}

ipcMain.handle('udp-request-latest', async () => {
  // Clear mother node status for any nodes that only have opcode 101 data
  // (opcode 102 is required for mother node status to be valid)
  const filteredNodes = latestNodes.map(node => {
    // If node only has opcode 101 data (opcode === 101), clear all opcode 102 metadata including mother node status
    if (node.opcode === 101) {
      return {
        ...node,
        // Clear opcode 102 metadata - node should be treated as normal network member
        callsign: undefined,
        callsignId: undefined,
        internalData: undefined,
        radioData: undefined,
        regionalData: undefined,
        battleGroupData: undefined,
      };
    }
    // Opcode 102 nodes are fine - they have complete data
    return node;
  });
  return filteredNodes;
});

ipcMain.handle('udp-request-targets', async () => {
  return latestTargets;
});

ipcMain.handle('udp-request-engagements', async () => {
  return latestEngagements;
});

ipcMain.handle('udp-request-threats', async () => {
  return latestThreats;
});

ipcMain.handle('get-config', async () => {
  return readConfigJson();
});

app.whenReady().then(async () => {
  try {
    // Show config dialog first
    const udpConfig = await promptForUdpConfig();
    // console.log('UDP Config:', udpConfig);
    
    // Set up UDP client
    await setupUdpClient(udpConfig.host, udpConfig.port);
    // console.log('UDP client connected');
  } catch (error) {
    console.error('UDP configuration was not provided:', error);
    app.quit();
    return;
  }

  // Create main window after config is provided
  createWindow();

  // Handle close app request from renderer
  ipcMain.handle('close-app', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

