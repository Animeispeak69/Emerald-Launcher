const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const querystring = require('querystring');
const { URL } = require('url');

const USER_DATA = path.join(app.getPath('userData'));
const STORAGE_FILE = path.join(USER_DATA, 'emerald_store.json');

function ensureStorage() {
  if (!fs.existsSync(USER_DATA)) fs.mkdirSync(USER_DATA, { recursive: true });
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ javas: [], accounts: [] }, null, 2));
  }
}

function readStorage() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
}
function writeStorage(obj) {
  ensureStorage();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(obj, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
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

// HTTP(S) helpers
function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(u, options, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${raw}`)));
        return;
      }
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (options.method === 'POST' && options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function postForm(url, data) {
  const body = querystring.stringify(data);
  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
}

function postJson(url, obj, headers = {}) {
  const body = JSON.stringify(obj);
  return fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
}

// Version manifest helpers (existing)
ipcMain.handle('get-version-manifest', async () => {
  const url = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
  const manifest = await fetchJson(url);
  return manifest;
});

ipcMain.handle('get-version-json', async (_, versionUrl) => {
  return await fetchJson(versionUrl);
});

ipcMain.handle('download-client', async (_, versionId, clientUrl) => {
  const base = path.join(app.getPath('userData'), '.emerald', 'versions', versionId);
  fs.mkdirSync(base, { recursive: true });
  const dest = path.join(base, `${versionId}.jar`);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(clientUrl, (res) => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
});

// Java selection & management
ipcMain.handle('list-javas', async () => {
  const store = readStorage();
  return store.javas || [];
});
ipcMain.handle('add-java', async (_, name, javaPath) => {
  const store = readStorage();
  store.javas = store.javas || [];
  store.javas.push({ name, path: javaPath });
  writeStorage(store);
  return store.javas;
});
ipcMain.handle('remove-java', async (_, idx) => {
  const store = readStorage();
  store.javas = store.javas || [];
  if (idx >= 0 && idx < store.javas.length) store.javas.splice(idx, 1);
  writeStorage(store);
  return store.javas;
});

// Simple launcher: improved to handle full classpath is non-trivial. Keep stub but improve args.
ipcMain.handle('launch-java', async (_, javaPath, versionId, jarPath, username, accessToken) => {
  if (!fs.existsSync(javaPath)) throw new Error('Java path not found');
  if (!fs.existsSync(jarPath)) throw new Error('Jar not found');
  if (!username || !accessToken) throw new Error('Username and access token required to launch');

  const { spawn } = require('child_process');
  const args = [
    '-Xmx2G',
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

// Microsoft device-code OAuth -> Xbox -> XSTS -> Minecraft token
// NOTE: This implements a device-code flow for convenience. For production register your own app and client id.
const DEFAULT_CLIENT_ID = '00000000402b5328'; // public client commonly used by community clients. Replace with your own client id for reliability.

ipcMain.handle('start-ms-device-auth', async (_, clientId) => {
  clientId = clientId || DEFAULT_CLIENT_ID;
  const url = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode';
  const data = { client_id: clientId, scope: 'XboxLive.signin offline_access openid' };
  const resp = await postForm(url, data);
  // resp has device_code, user_code, verification_uri, message, expires_in, interval
  // return resp to renderer and start polling with token endpoint when asked
  // Store device_code temporarily
  const store = readStorage();
  store._pending_device = { client_id: clientId, device_code: resp.device_code, expires_at: Date.now() + resp.expires_in * 1000 };
  writeStorage(store);
  return resp;
});

ipcMain.handle('poll-ms-device-token', async (_, ) => {
  const store = readStorage();
  const pending = store._pending_device;
  if (!pending) throw new Error('No pending device auth started');
  const tokenUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
  try {
    const tok = await postForm(tokenUrl, { grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: pending.client_id, device_code: pending.device_code });
    // tok contains access_token
    // Exchange to XBL
    const xbl = await postJson('https://user.auth.xboxlive.com/user/authenticate', {
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${tok.access_token}`
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    });

    const xsts = await postJson('https://xsts.auth.xboxlive.com/xsts/authorize', {
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xbl.Token]
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    });

    const uhs = xbl.DisplayClaims && xbl.DisplayClaims.xui && xbl.DisplayClaims.xui[0] && xbl.DisplayClaims.xui[0].uhs;
    const identityToken = `XBL3.0 x=${uhs};${xsts.Token}`;
    const mc = await postJson('https://api.minecraftservices.com/authentication/login_with_xbox', { identityToken });

    // get profile
    let profile = null;
    try {
      profile = await fetchJson('https://api.minecraftservices.com/minecraft/profile', { headers: { Authorization: `Bearer ${mc.access_token}` } });
    } catch (e) {
      // no profile if user doesn't own the game
    }

    const ent = await fetchJson('https://api.minecraftservices.com/entitlements/mcstore', { headers: { Authorization: `Bearer ${mc.access_token}` } }).catch(() => ({ items: [] }));

    const account = {
      id: uhs,
      ms_access_token: tok.access_token,
      ms_refresh_token: tok.refresh_token,
      xbox: xbl,
      xsts: xsts,
      mc_token: mc.access_token,
      mc_profile: profile,
      entitlements: ent.items || []
    };

    // Save account
    store.accounts = store.accounts || [];
    store.accounts.push(account);
    delete store._pending_device;
    writeStorage(store);

    return { account, ownsMinecraft: (ent.items || []).length > 0 };
  } catch (e) {
    // possible pending/authorization_pending
    throw e;
  }
});

ipcMain.handle('list-accounts', async () => {
  const store = readStorage();
  return store.accounts || [];
});

ipcMain.handle('logout-account', async (_, id) => {
  const store = readStorage();
  store.accounts = (store.accounts || []).filter((a) => a.id !== id);
  writeStorage(store);
  return store.accounts;
});

ipcMain.handle('select-java-dialog', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Java Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }]
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

// expose userData path
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});
