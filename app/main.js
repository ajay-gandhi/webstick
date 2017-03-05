
const { app, Menu, Tray, globalShortcut } = require('electron');
const fs = require('fs');

let tray = null;
let stickies_path = '/Users/Ajay/Library/StickiesDatabase';

fs.watch(stickies_path, (type, filename) => {
  // Re-sync
  sync_stickies();
});

app.dock.hide();

/********************************* Functions **********************************/

/**
 * Initializes the app
 */
let initialize = function () {
  sync_stickies();
  create_tray();

  // Create global shortcut to bring tray back
  globalShortcut.register('Ctrl+Alt+Cmd+W', () => {
    if (tray) {
      tray.destroy();
      tray = false;
    } else {
      create_tray();
    }
  });
}

/**
 * Syncs stickies with the server
 */
let sync_stickies = function () {
  console.log('Sync stickies');
}

/**
 * Creates the tray icon
 */
let create_tray = function () {
  if (tray) return;

  tray = new Tray(__dirname + '/menu_iconTemplate.png');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Synced ✓', enabled: false },
    {
      label: 'Show in menu bar',
      type: 'radio',
      checked: true,
      click: function () {
        tray.destroy();
        tray = false;
      }
    }
  ]);
  tray.setToolTip('Webstick');
  tray.setContextMenu(contextMenu);
}

app.on('ready', initialize);
