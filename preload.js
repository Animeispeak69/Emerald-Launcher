const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getVersionManifest: () => ipcRenderer.invoke('get-version-manifest'),
  getVersionJson: (url) => ipcRenderer.invoke('get-version-json', url),
  downloadClient: (versionId, clientUrl) => ipcRenderer.invoke('download-client', versionId, clientUrl),

  // Instances
  listInstances: () => ipcRenderer.invoke('list-instances'),
  createInstance: (name, mcVersion, loader) => ipcRenderer.invoke('create-instance', name, mcVersion, loader),
  getInstance: (instanceId) => ipcRenderer.invoke('get-instance', instanceId),
  updateInstance: (instanceId, updates) => ipcRenderer.invoke('update-instance', instanceId, updates),
  getInstancePath: (instanceId) => ipcRenderer.invoke('get-instance-path', instanceId),

  // Control profiles
  listControlProfiles: () => ipcRenderer.invoke('list-control-profiles'),
  getControlProfile: (name) => ipcRenderer.invoke('get-control-profile', name),
  saveControlProfile: (name, data) => ipcRenderer.invoke('save-control-profile', name, data),
  setActiveProfile: (name) => ipcRenderer.invoke('set-active-profile', name),
  deleteControlProfile: (name) => ipcRenderer.invoke('delete-control-profile', name),

  // Import data
  importSaves: (sourcePath, instanceId) => ipcRenderer.invoke('import-saves', sourcePath, instanceId),
  importResourcepacks: (sourcePath, instanceId) => ipcRenderer.invoke('import-resourcepacks', sourcePath, instanceId),
  importShaderpacks: (sourcePath, instanceId) => ipcRenderer.invoke('import-shaderpacks', sourcePath, instanceId),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Java manager
  listJavas: () => ipcRenderer.invoke('list-javas'),
  addJava: (name, path) => ipcRenderer.invoke('add-java', name, path),
  removeJava: (idx) => ipcRenderer.invoke('remove-java', idx),
  selectJavaDialog: () => ipcRenderer.invoke('select-java-dialog'),

  // Microsoft auth
  startMsDeviceAuth: (clientId) => ipcRenderer.invoke('start-ms-device-auth', clientId),
  pollMsDeviceToken: () => ipcRenderer.invoke('poll-ms-device-token'),
  listAccounts: () => ipcRenderer.invoke('list-accounts'),
  logoutAccount: (id) => ipcRenderer.invoke('logout-account', id),

  // Modrinth with filters
  modrinthSearch: (q, filters, limit) => ipcRenderer.invoke('modrinth-search', q, filters, limit),
  modrinthGetProject: (slug) => ipcRenderer.invoke('modrinth-get-project', slug),
  modrinthGetVersion: (versionId) => ipcRenderer.invoke('modrinth-get-version', versionId),
  modrinthDownloadFile: (versionId, fileIndex, instanceId) => ipcRenderer.invoke('modrinth-download-file', versionId, fileIndex, instanceId),
  modrinthDownloadModpack: (versionId, instanceId) => ipcRenderer.invoke('modrinth-download-modpack', versionId, instanceId),
  modrinthDownloadShader: (versionId, fileIndex, instanceId) => ipcRenderer.invoke('modrinth-download-shader', versionId, fileIndex, instanceId),
  modrinthDownloadResourcepack: (versionId, fileIndex, instanceId) => ipcRenderer.invoke('modrinth-download-resourcepack', versionId, fileIndex, instanceId),

  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path')
});
