/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        main.js
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This file is the only procedural file in the app. It is the
 *                  main entry point for the application. What it does: Listen
 *                  to app-Events and initialize the Zettlr object.
 *
 * END HEADER
 */

// First require the complete electron environment and put it into var
const electron = require('electron');

// Module to control application life.
const app = electron.app;
const process = require('process');

// Include the global Zettlr class
const Zettlr = require('./main/zettlr.js');

/**
 * The main Zettlr object. As long as this exists in memory, the app will run.
 * @type {Zettlr}
 */
let zettlr;

/**
 * Hook into the ready event and initialize the main object creating everything
 * else. It is necessary to wait for the ready event, because prior, some APIs
 * may not work correctly.
 */
app.on('ready', function() {
    zettlr = new Zettlr(this);
});

/**
 * Quit as soon as all windows are closed and we are not on macOS.
 */
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        // Save config before exit.
        zettlr.shutdown();
        app.quit();
    }
});

/**
 * On macOS also hook into the will-quit event to save config.json and stats.JSON
 */
app.on('will-quit', function() {
    zettlr.shutdown();
})

/**
 * On macOS, open a new window as soon as the user re-activates the app.
 */
app.on('activate', function () {
    zettlr.openWindow();
});

/**
 * Hook into the unhandledRejection-event to prevent nasty error messages when
 * a Promise is rejected somewhere.
 */
process.on('unhandledRejection', (err) => {
    // Just log to console.
    console.error('Received an unhandled rejection: ' + err.message);
});
