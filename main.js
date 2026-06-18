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
const CONTROLS_FILE = path.join(USER_DATA, '.emerald', 'controls.json');

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

function ensureControls() {
  const dir = path.dirname(CONTROLS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONTROLS_FILE)) {
    const defaults = {
      profiles: [
        {
          name: 'Default',
          keys: {
            forward: 'KeyW',
            back: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
            jump: 'Space',
            sneak: 'ShiftLeft',
            sprint: 'ControlLeft',
            attack: 'MouseButton1',
            use: 'MouseButton2',
            inventory: 'KeyE'
          },
          gamepadEnabled: false,
          gamepadAxes: {
            leftStickX: 0,
            leftStickY: 1,
            rightStickX: 2,
            rightStickY: 3
          },
          gamepadButtons: {
            jump: 0,
            attack: 1,
            use: 2
          }
        }
      ],
      active: 'Default'
    };
    fs.writeFileSync(CONTROLS_FILE, JSON.stringify(defaults, null, 2));
  }
}

function readControls() {
  ensureControls();
  return JSON.parse(fs.readFileSync(CONTROLS_FILE, 'utf8'));
}
function writeControls(obj) {
  ensureControls();
  fs.writeFileSync(CONTROLS_FILE, JSON.stringify(obj, null, 2));
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
  fs.mkdirSync(path.join(baseDir, 'saves'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'options'), { recursive: true });

  const config = {
    id: instanceId,
    name: name || instanceId,
    mcVersion,
    loader,
    createdAt: new Date().toISOString(),
    selectedJavaIdx: -1,
    selectedAccountId: null,
    jvmArgs: '-Xmx2G -XX:+UseG1GC -XX:MaxGCPauseMillis=130 -XX:+UnlockDiagnosticVMOptions -XX:G1SummarizeRSetStatsPeriod=1000000 -XX:G1HeapRegionSize=16M',
    renderer: 'default',
    graphicsQuality: 'fancy',
    renderDistance: 12,
    controlProfile: 'Default'
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

// Control profiles
ipcMain.handle('list-control-profiles', async () => {
  const controls = readControls();
  return controls.profiles || [];
});

ipcMain.handle('get-control-profile', async (_, profileName) => {
  const controls = readControls();
  const profile = (controls.profiles || []).find(p => p.name === profileName);
  if (!profile) throw new Error('Control profile not found: ' + profileName);
  return profile;
});

ipcMain.handle('save-control-profile', async (_, profileName, profileData) => {
  const controls = readControls();
  let profile = (controls.profiles || []).find(p => p.name === profileName);
  if (!profile) {
    profile = { name: profileName, ...profileData };
    controls.profiles.push(profile);
  } else {
    Object.assign(profile, profileData);
  }
  writeControls(controls);
  return profile;
});

ipcMain.handle('set-active-profile', async (_, profileName) => {
  const controls = readControls();
  controls.active = profileName;
  writeControls(controls);
  return controls;
});

ipcMain.handle('delete-control-profile', async (_, profileName) => {
  const controls = readControls();
  controls.profiles = (controls.profiles || []).filter(p => p.name !== profileName);
  writeControls(controls);
  return controls;
});

// Import saves / data
ipcMain.handle('import-saves', async (_, sourcePath, instanceId) => {
  const destPath = path.join(INSTANCES_DIR, instanceId, 'saves');
  if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
  
  // Copy all .zip files (world backups) and world directories
  const items = fs.readdirSync(sourcePath);
  const imported = [];
  for (const item of items) {
    const src = path.join(sourcePath, item);
    const stat = fs.statSync(src);
    if (stat.isDirectory() || item.endsWith('.zip')) {
      const dest = path.join(destPath, item);
      if (!fs.existsSync(dest)) {
        // Simple copy: for directories use recursive copy
        if (stat.isDirectory()) {
          const copyDir = (src, dest) => {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach(f => {
              const srcFile = path.join(src, f);
              const destFile = path.join(dest, f);
              if (fs.statSync(srcFile).isDirectory()) {
                copyDir(srcFile, destFile);
              } else {
                fs.copyFileSync(srcFile, destFile);
              }
            });
          };
          copyDir(src, dest);
        } else {
          fs.copyFileSync(src, dest);
        }
        imported.push(item);
      }
    }
  }
  return imported;
});

ipcMain.handle('import-resourcepacks', async (_, sourcePath, instanceId) => {
  const destPath = path.join(INSTANCES_DIR, instanceId, 'resourcepacks');
  if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
  
  const items = fs.readdirSync(sourcePath);
  const imported = [];
  for (const item of items) {
    if (item.endsWith('.zip') || item.endsWith('.jar')) {
      const src = path.join(sourcePath, item);
      const dest = path.join(destPath, item);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        imported.push(item);
      }
    }
  }
  return imported;
});

ipcMain.handle('import-shaderpacks', async (_, sourcePath, instanceId) => {
  const destPath = path.join(INSTANCES_DIR, instanceId, 'shaderpacks');
  if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
  
  const items = fs.readdirSync(sourcePath);
  const imported = [];
  for (const item of items) {
    if (item.endsWith('.zip')) {
      const src = path.join(sourcePath, item);
      const dest = path.join(destPath, item);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        imported.push(item);
      }
    }
  }
  return imported;
});

ipcMain.handle('select-folder', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
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

// Microsoft device-code OAuth
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
    } catch (e) {}

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
