import { app, BrowserWindow, Tray, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { monitor } from "./src/monitor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray, iconWindow;

app.whenReady().then(() => {
  // Tray icon
  tray = new Tray(path.join(__dirname, "public/icon.png"));
  const menu = Menu.buildFromTemplate([
    { label: "Open Nexora", click: () => iconWindow.show() },
    { label: "Exit", click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);

  // Floating orb
  iconWindow = new BrowserWindow({
    width: 60,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  iconWindow.loadFile("icon.html");

  // Start monitoring
  monitor(["PROJECT_CHRONOS_ANALYSIS", "OPERATION_NIGHTFALL_PREP"]);
});
