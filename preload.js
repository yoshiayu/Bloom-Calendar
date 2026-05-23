const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  openExternalUrl: (url) => ipcRenderer.invoke("open-external-url", url),
  getAppInfo: () => ipcRenderer.invoke("desktop-app-info"),
});
