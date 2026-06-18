const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Helpers
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

ipcMain.handle('get-version-manifest', async () => {
  const url = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
  const manifest = await fetchJson(url);
  return manifest; // contains versions array with type field
});

ipcMain.handle('get-version-json', async (_, versionUrl) => {
  return await fetchJson(versionUrl);
});

ipcMain.handle('download-client', async (_, versionId, clientUrl) => {
  const base = path.join(app.getPath('userData'), '.emerald', 'versions', versionId);
  fs.mkdirSync(base, { recursive: true });
  const dest = path.join(base, `${versionId}.jar`);
  await downloadToFile(clientUrl, dest);
  return dest;
});

ipcMain.handle('select-java', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Java Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }]
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

ipcMain.handle('launch-java', async (_, javaPath, versionId, jarPath, username, accessToken) => {
  // Very simple launch: must provide a valid accessToken and username (this avoids storing credentials in the app)
  // This does NOT provide full session handling or server auth. Use official authentication flows.
  if (!fs.existsSync(javaPath)) throw new Error('Java path not found');
  if (!fs.existsSync(jarPath)) throw new Error('Jar not found');
  if (!username || !accessToken) throw new Error('Username and access token required to launch');

  const { spawn } = require('child_process');
  const args = [
    '-Xmx2G',
    '-Djava.library.path=' + path.dirname(jarPath),
    '-jar',
    jarPath,
    '--username', username,
    '--version', versionId,
    '--accessToken', accessToken
  ];

  const child = spawn(javaPath, args, { stdio: 'inherit' });

  child.on('error', (err) => console.error('Launch error:', err));

  return true;
});
