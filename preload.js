const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getVersionManifest: () => ipcRenderer.invoke('get-version-manifest'),
  getVersionJson: (url) => ipcRenderer.invoke('get-version-json', url),
  downloadClient: (versionId, clientUrl) => ipcRenderer.invoke('download-client', versionId, clientUrl),
  selectJava: () => ipcRenderer.invoke('select-java'),
  launchJava: (javaPath, versionId, jarPath, username, accessToken) => ipcRenderer.invoke('launch-java', javaPath, versionId, jarPath, username, accessToken)
});
