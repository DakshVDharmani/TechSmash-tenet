# Nexora Chrome Extension (TechSmash)

This extension tracks user activity (URLs + time spent), sends data to Supabase, 
and can block forbidden sites by showing a fullscreen video before closing the tab.

---

## 📂 File Structure

TechSmash/
├── main.jsx # Your Electron main entry
└── extensions/
├── manifest.json
├── background.js
├── content.js
├── options.html
├── styles/
│ └── content.css
├── assets/
│ ├── icon.jpg
│ └── default-video.mp4
└── README.md


---

## ⚙️ Installation (Chrome)

1. Open **Chrome** → `chrome://extensions`.
2. Enable **Developer Mode** (top-right).
3. Click **Load unpacked** and select the `TechSmash/extensions` folder.
4. The Nexora extension will appear with your `icon.jpg`.

---

## 🖥️ Integration with Electron

In your `main.jsx` (or Electron `main.js`), load the extension:

```js
import { app, BrowserWindow, session } from "electron";
import path from "path";

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    webPreferences: { nodeIntegration: false }
  });

  const extPath = path.join(__dirname, "extensions");
  await session.defaultSession.loadExtension(extPath);

  win.loadURL("http://localhost:5174/");
});
