
const { app, Menu, Tray, globalShortcut, BrowserWindow } = require('electron');

const request     = require('request');
const Configstore = require('configstore');
const fs          = require('fs');
const stickies    = require('./stickies');

const conf = new Configstore(require('./package.json').name);

let tray = null;
let stickies_path = process.env['HOME'] + '/Library/StickiesDatabase';

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

  if (!conf.get('fb_user_id')) {
    // Load FB login
    fbWindow = new BrowserWindow({ width: 800, height: 600 })

    fbWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'fb.html'),
      protocol: 'file:',
      slashes: true
    }));

    // Emitted when the window is closed.
    fbWindow.on('closed', function () {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      fbWindow = null
    })
  }
}

/**
 * Syncs stickies with the server
 */
let sync_stickies = function () {
  stickies(stickies_path, (rtfs) => {
    console.log('Got', rtfs.length, 'stickies, sending to backend');
    console.log(conf.get('fb_user_id'));
  });
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
