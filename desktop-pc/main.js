const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, nativeImage, globalShortcut, screen } = require('electron');
const path = require('path');
const AuthStore = require('./engine/auth-store');
const ProtectionService = require('./engine/protection-service');

const { exec } = require('child_process');

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let isQuittingAuthorized = false;
let isSystemAudioMutedByShield = false;

const authStore = new AuthStore();
const protectionService = new ProtectionService(authStore);

function muteSystemAudio() {
  if (!isSystemAudioMutedByShield) {
    try {
      exec(`powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"`, { windowsHide: true });
      isSystemAudioMutedByShield = true;
    } catch (e) {
      console.error('Failed to mute audio:', e);
    }
  }
}

function unmuteSystemAudio() {
  if (isSystemAudioMutedByShield) {
    try {
      exec(`powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"`, { windowsHide: true });
      isSystemAudioMutedByShield = false;
    } catch (e) {
      console.error('Failed to unmute audio:', e);
    }
  }
}

function showNudityOverlay() {
  const state = authStore.getState();
  if (!state.cinemaShieldEnabled) return;

  const mode = state.cinemaShieldMode || 'both';

  // Audio protection: Mute explicit sounds/moans
  if (mode === 'both' || mode === 'audio_only') {
    muteSystemAudio();
  }

  // Video protection: Black screen cover
  if (mode === 'both' || mode === 'video_only') {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.show();
      overlayWindow.focus();
      return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    overlayWindow = new BrowserWindow({
      width: width,
      height: height,
      x: 0,
      y: 0,
      frame: false,
      transparent: false,
      backgroundColor: '#000000',
      alwaysOnTop: true,
      fullscreen: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    overlayWindow.loadFile(path.join(__dirname, 'ui', 'black-screen-overlay.html'));

    overlayWindow.on('closed', () => {
      overlayWindow = null;
      unmuteSystemAudio();
    });
  }
}

function hideNudityOverlay() {
  unmuteSystemAudio();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 720,
    minWidth: 900,
    minHeight: 650,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0b0f19',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

  // Anti-tamper: Intercept close button
  mainWindow.on('close', (event) => {
    if (!isQuittingAuthorized) {
      event.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon({
          title: 'AegisShield Active',
          content: 'Protection continues running quietly in the background to keep you safe.'
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a simple 16x16 icon or native icon
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch (e) {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('AegisShield - Adult Content Protection (Active)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open AegisShield Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Protection Status: ACTIVE',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Exit (Requires Master Password)',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('prompt-exit-dialog');
        }
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Start Protection Engine
function initializeProtectionEngine() {
  const state = authStore.getState();
  if (state.protectionEnabled) {
    try {
      protectionService.applyHostsProtection();
    } catch (e) {
      console.error('Initial hosts protection error:', e);
    }
  }

  // Start real-time active window & cinema watchdog
  protectionService.startWatchdog(
    (threat) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('threat-intercepted', threat);
      }
    },
    (cinemaScene) => {
      // AUTOMATICALLY TRIGGER CINEMA NUDITY SHIELD!
      showNudityOverlay();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('threat-intercepted', cinemaScene);
      }
    }
  );
}

// Single instance lock (prevents running duplicate or bypassing)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
    initializeProtectionEngine();

    // Register Instant Black Screen Shield Hotkey (Ctrl + Shift + B)
    try {
      globalShortcut.register('CommandOrControl+Shift+B', () => {
        showNudityOverlay();
      });
    } catch (e) {
      console.log('Failed to register global shortcut:', e);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// Clean up shortcuts when app quits
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Prevent arbitrary quit without authorized password
app.on('before-quit', (e) => {
  if (!isQuittingAuthorized && authStore.isConfigured()) {
    e.preventDefault();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('prompt-exit-dialog');
    }
  }
});

// IPC Handler Registrations
ipcMain.on('dismiss-nudity-overlay', () => {
  hideNudityOverlay();
});

ipcMain.handle('trigger-nudity-overlay', async () => {
  showNudityOverlay();
  return { success: true };
});
ipcMain.handle('get-state', async () => {
  return authStore.getState();
});

ipcMain.handle('setup-master-password', async (event, password) => {
  try {
    authStore.setupMasterPassword(password);
    protectionService.applyHostsProtection();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('verify-password', async (event, password) => {
  return { success: authStore.verifyPassword(password) };
});

ipcMain.handle('change-password', async (event, { oldPassword, newPassword }) => {
  try {
    authStore.changePassword(oldPassword, newPassword);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('toggle-protection', async (event, { password, enabled }) => {
  try {
    const newState = authStore.toggleProtection(password, enabled);
    if (enabled) {
      protectionService.applyHostsProtection();
      protectionService.startWatchdog(
        (threat) => {
          if (mainWindow) mainWindow.webContents.send('threat-intercepted', threat);
        },
        (cinemaScene) => {
          showNudityOverlay();
          if (mainWindow) mainWindow.webContents.send('threat-intercepted', cinemaScene);
        }
      );
    } else {
      protectionService.removeHostsProtection();
      protectionService.stopWatchdog();
    }
    return { success: true, state: newState };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// PASSWORD-FREE Cinema Settings Update (as requested by user)
ipcMain.handle('update-cinema-settings', async (event, settings) => {
  const newState = authStore.updateCinemaSettings(settings);
  return { success: true, state: newState };
});

ipcMain.handle('update-settings', async (event, { password, settings }) => {
  try {
    const newState = authStore.updateSettings(password, settings);
    protectionService.applyHostsProtection();
    return { success: true, state: newState };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('authorize-and-exit', async (event, password) => {
  if (authStore.verifyPassword(password)) {
    isQuittingAuthorized = true;
    protectionService.stopWatchdog();
    app.quit();
    return { success: true };
  } else {
    return { success: false, error: 'Incorrect Master Password! Application cannot be closed.' };
  }
});

ipcMain.handle('apply-hosts-filter', async () => {
  return protectionService.applyHostsProtection();
});
