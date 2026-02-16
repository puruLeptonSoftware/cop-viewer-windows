import { app, BrowserWindow, ipcMain } from 'electron';
import dgram from 'node:dgram';
import path from 'node:path';
import { parseUdpMessage } from './utils/parsers';

let mainWindow: BrowserWindow | null = null;
let promptWindow: BrowserWindow | null = null;
let udpSocket: dgram.Socket | null = null;
let latestNodes: Array<any> = [];
let opcode101Members: Map<number, any> = new Map();
let latestTargets: Array<any> = [];
let latestEngagements: Array<any> = [];
let latestThreats: Array<any> = [];

function promptForUdpConfig(): Promise<{ host: string; port: number }> {
  return new Promise((resolve, reject) => {
    if (promptWindow) {
      promptWindow.focus();
      return;
    }

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
              <input type="text" id="udp-host" value="127.0.0.1" required />
            </label>
            <label>
              Port
              <input type="number" id="udp-port" value="5005" min="1" max="65535" required />
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
      console.log(`[UDP] Setting up client on ${host}:${port}`);
      udpSocket = dgram.createSocket('udp4');

      udpSocket.on('error', (err) => {
        console.error('[UDP] error:', err);
        reject(err);
      });

      udpSocket.on('message', (msg) => {
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
          // Store opcode 101 members in map
          for (const member of data) {
            opcode101Members.set(member.globalId, member);
          }
          const allMembers = Array.from(opcode101Members.values());
          latestNodes = allMembers;
          sendToRenderer(allMembers);
        } else if (opcode === 102) {
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
  return latestNodes;
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

