const path = require("path");
const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1240,
    minHeight: 820,
    backgroundColor: "#f4f7fb",
    title: "Bloom Calendar",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("open-external-url", async (_event, url) => {
  if (!url || typeof url !== "string") return { ok: false };
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (_error) {
    return { ok: false };
  }
});

ipcMain.handle("desktop-app-info", () => {
  return {
    platform: process.platform,
    version: app.getVersion(),
    isPackaged: app.isPackaged,
  };
});
