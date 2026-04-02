import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  Menu,
  shell,
} from 'electron';
import path from 'path';
import { readRecentMessages, sendMessage, watchForNewMessages } from './imessage';
import { createTray, updateTrayBadge } from './tray';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let unreadCount = 0;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Hide to tray on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC() {
  ipcMain.handle('read-chat-db', async (_event, sinceRowId?: number) => {
    try {
      return { ok: true, data: readRecentMessages(sinceRowId) };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('send-imessage', async (_event, phone: string, text: string) => {
    try {
      await sendMessage(phone, text);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('get-station-status', async () => {
    return {
      ok: true,
      data: {
        online: true,
        hostname: require('os').hostname(),
        platform: process.platform,
        uptime: process.uptime(),
      },
    };
  });
}

function setupMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';

  app.setAboutPanelOptions({
    applicationName: 'Vernacular',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright (c) 2026 Vernacular',
  });

  createWindow();
  setupIPC();
  setupMenu();
  createTray(mainWindow!);

  // Watch for new messages and forward to renderer
  watchForNewMessages((messages) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('new-messages', messages);
      unreadCount += messages.filter((m) => !m.isFromMe).length;
      app.dock?.setBadge(unreadCount > 0 ? String(unreadCount) : '');
      updateTrayBadge(unreadCount);
    }
  }, 5000);
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createWindow();
  }
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running in the tray
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Reset unread count when window is focused
app.on('browser-window-focus', () => {
  unreadCount = 0;
  app.dock?.setBadge('');
  updateTrayBadge(0);
});
