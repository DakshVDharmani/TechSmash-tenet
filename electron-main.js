import { app, BrowserWindow, session } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (process.env.NODE_ENV === "development") {
    // React dev server (Vite)
    win.loadURL("http://localhost:5173");
  } else {
    // React production build
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }
}

app.whenReady().then(async () => {
  // Load your Chrome extension from extensions/ folder
  const extPath = path.join(__dirname, "extensions");
  await session.defaultSession.loadExtension(extPath);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
