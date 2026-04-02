import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';

let tray: Tray | null = null;
let stationOnline = true;

/**
 * Create the menu bar tray icon with context menu.
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  // Use a template image for macOS menu bar (16x16)
  // In production, use assets/trayTemplate.png
  // For now, create a simple nativeImage
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Vernacular');

  const contextMenu = buildContextMenu(mainWindow);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  return tray;
}

function buildContextMenu(mainWindow: BrowserWindow): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show Vernacular',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: `Station: ${stationOnline ? '🟢 Online' : '🔴 Offline'}`,
      enabled: false,
    },
    {
      label: 'Toggle Station',
      click: () => {
        stationOnline = !stationOnline;
        if (tray && mainWindow) {
          tray.setContextMenu(buildContextMenu(mainWindow));
        }
        mainWindow.webContents.send('station-status-changed', stationOnline);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Vernacular',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);
}

/**
 * Update the tray badge count (shows in tooltip on macOS).
 */
export function updateTrayBadge(count: number): void {
  if (!tray) return;
  tray.setToolTip(count > 0 ? `Vernacular (${count} unread)` : 'Vernacular');
}

/**
 * Update the station online/offline status in the tray.
 */
export function setStationStatus(online: boolean, mainWindow: BrowserWindow): void {
  stationOnline = online;
  if (tray) {
    tray.setContextMenu(buildContextMenu(mainWindow));
  }
}
