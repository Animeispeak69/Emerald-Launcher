const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getVersionManifest: () => ipcRenderer.invoke('get-version-manifest'),
  getVersionJson: (url) => ipcRenderer.invoke('get-version-json', url),
  downloadClient: (versionId, clientUrl) => ipcRenderer.invoke('download-client', versionId, clientUrl),
  selectJava: () => ipcRenderer.invoke('select-java'),
  launchJava: (javaPath, versionId, jarPath, username, accessToken) => ipcRenderer.invoke('launch-java', javaPath, versionId, jarPath, username, accessToken),

  // Java manager
  listJavas: () => ipcRenderer.invoke('list-javas'),
  addJava: (name, path) => ipcRenderer.invoke('add-java', name, path),
  removeJava: (idx) => ipcRenderer.invoke('remove-java', idx),
  selectJavaDialog: () => ipcRenderer.invoke('select-java-dialog'),

  // Microsoft auth (device code flow)
  startMsDeviceAuth: (clientId) => ipcRenderer.invoke('start-ms-device-auth', clientId),
  pollMsDeviceToken: () => ipcRenderer.invoke('poll-ms-device-token'),
  listAccounts: () => ipcRenderer.invoke('list-accounts'),
  logoutAccount: (id) => ipcRenderer.invoke('logout-account', id),

  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path')
});
