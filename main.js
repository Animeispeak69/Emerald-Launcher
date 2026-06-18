const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const querystring = require('querystring');
const { URL } = require('url');
const { spawn } = require('child_process');

const USER_DATA = path.join(app.getPath('userData'));
const STORAGE_FILE = path.join(USER_DATA, 'emerald_store.json');
const INSTANCES_DIR = path.join(USER_DATA, '.emerald', 'instances');

function ensureStorage() {
  if (!fs.existsSync(USER_DATA)) fs.mkdirSync(USER_DATA, { recursive: true });
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ javas: [], accounts: [], instances: [] }, null, 2));
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
    width: 1400,
    height: 900,
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

function downloadFile(url, dest) {
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

// Version manifest helpers
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
  await downloadFile(clientUrl, dest);
  return dest;
});

// Instance management
ipcMain.handle('list-instances', async () => {
  const store = readStorage();
  return store.instances || [];
});

ipcMain.handle('create-instance', async (_, name, mcVersion, loader) => {
  const instanceId = `${mcVersion}-${loader}`;
  const baseDir = path.join(INSTANCES_DIR, instanceId);
  fs.mkdirSync(baseDir, { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'mods'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'resourcepacks'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'shaderpacks'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'versions'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'libraries'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'natives'), { recursive: true });

  const config = {
    id: instanceId,
    name: name || instanceId,
    mcVersion,
    loader,
    createdAt: new Date().toISOString(),
    selectedJavaIdx: -1,
    selectedAccountId: null
  };

  fs.writeFileSync(path.join(baseDir, 'instance.json'), JSON.stringify(config, null, 2));

  const store = readStorage();
  store.instances = store.instances || [];
  store.instances.push(config);
  writeStorage(store);

  return config;
});

ipcMain.handle('get-instance', async (_, instanceId) => {
  const configFile = path.join(INSTANCES_DIR, instanceId, 'instance.json');
  if (!fs.existsSync(configFile)) throw new Error('Instance not found: ' + instanceId);
  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
});

ipcMain.handle('update-instance', async (_, instanceId, updates) => {
  const configFile = path.join(INSTANCES_DIR, instanceId, 'instance.json');
  if (!fs.existsSync(configFile)) throw new Error('Instance not found: ' + instanceId);
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  Object.assign(config, updates);
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  return config;
});

ipcMain.handle('get-instance-path', async (_, instanceId) => {
  return path.join(INSTANCES_DIR, instanceId);
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

ipcMain.handle('select-java-dialog', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Java Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }]
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

// Microsoft device-code OAuth -> Xbox -> XSTS -> Minecraft token
const DEFAULT_CLIENT_ID = '00000000402b5328';

ipcMain.handle('start-ms-device-auth', async (_, clientId) => {
  clientId = clientId || DEFAULT_CLIENT_ID;
  const url = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode';
  const data = { client_id: clientId, scope: 'XboxLive.signin offline_access openid' };
  const resp = await postForm(url, data);
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

    store.accounts = store.accounts || [];
    store.accounts.push(account);
    delete store._pending_device;
    writeStorage(store);

    return { account, ownsMinecraft: (ent.items || []).length > 0 };
  } catch (e) {
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

// Modrinth integration with filters
function buildModrinthQuery(query, filters = {}) {
  let q = `query=${encodeURIComponent(query)}`;
  if (filters.loaders && filters.loaders.length > 0) {
    q += `&facets=["loaders:[${filters.loaders.map(l => '"' + l + '"').join(',')}]"]`;
  }
  if (filters.categories && filters.categories.length > 0) {
    q += `&facets=["categories:[${filters.categories.map(c => '"' + c + '"').join(',')}]"]`;
  }
  // Modrinth facets: note that multiple facet filters need special formatting
  // For now, simplified: loaders and categories
  return q;
}

ipcMain.handle('modrinth-search', async (_, query, filters = {}, limit = 12) => {
  let q = buildModrinthQuery(query, filters);
  const url = `https://api.modrinth.com/v2/search?${q}&limit=${limit}`;
  return await fetchJson(url);
});

ipcMain.handle('modrinth-get-project', async (_, slug) => {
  const url = `https://api.modrinth.com/v2/project/${encodeURIComponent(slug)}`;
  return await fetchJson(url);
});

ipcMain.handle('modrinth-get-version', async (_, versionId) => {
  const url = `https://api.modrinth.com/v2/version/${encodeURIComponent(versionId)}`;
  return await fetchJson(url);
});

ipcMain.handle('modrinth-download-file', async (_, versionId, fileIndex, instanceId) => {
  const ver = await fetchJson(`https://api.modrinth.com/v2/version/${encodeURIComponent(versionId)}`);
  if (!ver || !ver.files || ver.files.length === 0) throw new Error('Version has no files');
  const file = ver.files[fileIndex || 0];
  if (!file) throw new Error('File index out of range');
  const url = file.url;
  const base = path.join(INSTANCES_DIR, instanceId, 'mods');
  fs.mkdirSync(base, { recursive: true });
  const dest = path.join(base, file.filename || path.basename(new URL(url).pathname));
  await downloadFile(url, dest);
  return dest;
});

ipcMain.handle('modrinth-download-modpack', async (_, versionId, instanceId) => {
  const ver = await fetchJson(`https://api.modrinth.com/v2/version/${encodeURIComponent(versionId)}`);
  if (!ver || !ver.files || ver.files.length === 0) throw new Error('Modpack version has no files');

  const base = path.join(INSTANCES_DIR, instanceId, 'mods');
  fs.mkdirSync(base, { recursive: true });

  const downloaded = [];
  for (const f of ver.files) {
    if (!f.project_id || !f.version_id) continue;
    try {
      const v = await fetchJson(`https://api.modrinth.com/v2/version/${encodeURIComponent(f.version_id)}`);
      const fileObj = v.files && v.files[0];
      if (!fileObj) continue;
      const url = fileObj.url;
      const dest = path.join(base, fileObj.filename || path.basename(new URL(url).pathname));
      await downloadFile(url, dest);
      downloaded.push(dest);
    } catch (e) {
      console.error('Failed to download mod from modpack:', e.message || e);
    }
  }

  return downloaded;
});

// Modrinth: download shaders
ipcMain.handle('modrinth-download-shader', async (_, versionId, fileIndex, instanceId) => {
  const ver = await fetchJson(`https://api.modrinth.com/v2/version/${encodeURIComponent(versionId)}`);
  if (!ver || !ver.files || ver.files.length === 0) throw new Error('Shader version has no files');
  const file = ver.files[fileIndex || 0];
  const url = file.url;
  const base = path.join(INSTANCES_DIR, instanceId, 'shaderpacks');
  fs.mkdirSync(base, { recursive: true });
  const dest = path.join(base, file.filename || path.basename(new URL(url).pathname));
  await downloadFile(url, dest);
  return dest;
});

// Modrinth: download resource pack
ipcMain.handle('modrinth-download-resourcepack', async (_, versionId, fileIndex, instanceId) => {
  const ver = await fetchJson(`https://api.modrinth.com/v2/version/${encodeURIComponent(versionId)}`);
  if (!ver || !ver.files || ver.files.length === 0) throw new Error('Resource pack version has no files');
  const file = ver.files[fileIndex || 0];
  const url = file.url;
  const base = path.join(INSTANCES_DIR, instanceId, 'resourcepacks');
  fs.mkdirSync(base, { recursive: true });
  const dest = path.join(base, file.filename || path.basename(new URL(url).pathname));
  await downloadFile(url, dest);
  return dest;
});

// expose userData path
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});
