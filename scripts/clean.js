const fs = require('fs');
const path = require('path');

/**
 * Recursively removes a directory and all its contents
 * This is a workaround for Windows ENOTEMPTY errors
 */
function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  // Use modern Node.js recursive removal (Node 14.14+)
  if (fs.rmSync) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      return;
    } catch (err) {
      // Fall back to manual removal if rmSync fails
      console.warn(`Warning: fs.rmSync failed, trying manual removal: ${err.message}`);
    }
  }

  // Fallback: Manual recursive removal
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        removeDir(filePath);
      } else {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          // File might be locked, try again after a short delay
          if (err.code === 'EBUSY' || err.code === 'EPERM') {
            setTimeout(() => {
              try {
                fs.unlinkSync(filePath);
              } catch (retryErr) {
                console.warn(`Warning: Could not delete ${filePath}: ${retryErr.message}`);
              }
            }, 100);
          } else {
            console.warn(`Warning: Could not delete ${filePath}: ${err.message}`);
          }
        }
      }
    }
    
    // Try to remove the directory itself
    try {
      fs.rmdirSync(dirPath);
    } catch (err) {
      // On Windows, sometimes we need to retry
      if (err.code === 'ENOTEMPTY' || err.code === 'EBUSY') {
        setTimeout(() => {
          try {
            fs.rmdirSync(dirPath);
          } catch (retryErr) {
            console.warn(`Warning: Could not remove directory ${dirPath}: ${retryErr.message}`);
          }
        }, 200);
      } else {
        console.warn(`Warning: Could not remove directory ${dirPath}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn(`Warning: Error reading directory ${dirPath}: ${err.message}`);
  }
}

// Clean .vite directory
const viteDir = path.join(__dirname, '..', '.vite');
if (fs.existsSync(viteDir)) {
  console.log('Cleaning .vite directory...');
  removeDir(viteDir);
  console.log('Cleanup complete!');
} else {
  console.log('.vite directory does not exist, skipping cleanup.');
}

