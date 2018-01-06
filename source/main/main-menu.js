// Main menu file

const {Menu} = require('electron');
const electron = require('electron');
const app = electron.app
const {trans} = require('../common/lang/i18n.js');

const template = [
    {
        label: trans(global.i18n.menu.labels.file),
        submenu: [
            {
                label: trans(global.i18n.menu.new_file),
                accelerator: 'CmdOrCtrl+N',
                click (item, focusedWindow) {
                    // Trigger new file in current directory
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'new-file'});
                }
            },
            {
                label: trans(global.i18n.menu.new_dir),
                accelerator: 'CmdOrCtrl+Shift+N',
                click (item, focusedWindow) {
                    // Trigger new folder in current directory
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'new-dir'});
                }
            },
            { type: 'separator' },
            {
                label: trans(global.i18n.menu.open),
                accelerator: 'CmdOrCtrl+O',
                click (item, focusedWindow) {
                    // Trigger open folder action
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'open-dir'});
                }
            },
            {
                label: trans(global.i18n.menu.save),
                accelerator: 'CmdOrCtrl+S',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'save-file'});
                }
            },
            { type: 'separator' },
            {
                label: trans(global.i18n.menu.export),
                accelerator: 'CmdOrCtrl+E',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'export'});
                }
            },
            { type: 'separator' },
            {
                label: trans(global.i18n.menu.rename_file),
                accelerator: 'CmdOrCtrl+R',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'rename-file'});
                }
            },
            {
                label: trans(global.i18n.menu.rename_dir),
                accelerator: 'CmdOrCtrl+Shift+R',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'rename-dir'});
                }
            },
            { type: 'separator' },
            {
                label: trans(global.i18n.menu.delete_file),
                accelerator: 'CmdOrCtrl+D',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'remove-file'});
                }
            }, {
                label: trans(global.i18n.menu.delete_dir),
                accelerator: 'CmdOrCtrl+Shift+D',
                click(item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'remove-dir'});
                }
            }
        ]
    },
    {
        label: trans(global.i18n.menu.labels.edit),
        submenu: [
            { label: trans(global.i18n.menu.undo), role: 'undo' },
            { label: trans(global.i18n.menu.redo), role: 'redo' },
            { type: 'separator' },
            { label: trans(global.i18n.menu.cut), role: 'cut' },
            { label: trans(global.i18n.menu.copy), role: 'copy' },
            { label: trans(global.i18n.menu.paste), role: 'paste' },
            { label: trans(global.i18n.menu.select_all), role: 'selectall' },
            { type: 'separator' },
            {
                label: trans(global.i18n.menu.find_file),
                accelerator: 'CmdOrCtrl+F',
                click(item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'find-file'});
                }
            },
            {
                label: trans(global.i18n.menu.find_dir),
                accelerator: 'CmdOrCtrl+Shift+F',
                click(item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', { 'command': 'find-dir'});
                }
            }
        ]
    },
    {
        label: trans(global.i18n.menu.labels.view),
        submenu: [
            {
                label: trans(global.i18n.menu.reload),
                accelerator: 'CmdOrCtrl+Y',
                click (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.reload();
                }
            },
            {
                label: trans(global.i18n.menu.toggle_devtools),
                accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
                }
            },
            { type: 'separator' },
            {
                label: trans(global.i18n.menu.toggle_theme),
                accelerator: 'CmdOrCtrl+Alt+L',
                click(item, focusedWindow) {
                    if (focusedWindow) focusedWindow.webContents.send('message', { 'command': 'toggle-theme'});
                }
            },
            {
                label: trans(global.i18n.menu.toggle_snippets),
                accelerator: 'CmdOrCtrl+Alt+S',
                click(item, focusedWindow) {
                    if (focusedWindow) focusedWindow.webContents.send('message', { 'command': 'toggle-snippets'});
                }
            },
            { type: 'separator' },
            { label: trans(global.i18n.menu.reset_zoom), role: 'resetzoom' },
            { label: trans(global.i18n.menu.zoom_in), role: 'zoomin' },
            { label: trans(global.i18n.menu.zoom_out), role: 'zoomout' },
            { type: 'separator' },
            { label: trans(global.i18n.menu.toggle_fullscreen), role: 'togglefullscreen' }
        ]
    },
    {
        label: trans(global.i18n.menu.labels.window),
        role: 'window',
        submenu: [
            { label: trans(global.i18n.menu.win_minimize), role: 'minimize' },
            { label: trans(global.i18n.menu.win_close), role: 'close' }
        ]
    },
    {
        label: trans(global.i18n.menu.labels.help),
        role: 'help',
        submenu: [
            {
                label: trans(global.i18n.menu.learn_more),
                click () { require('electron').shell.openExternal('https://www.zettlr.com/') }
            }
        ]
    }
]

if(process.platform != 'darwin') {
    // On windows and linux add a quit option.
    // On macOS this is automatically added to the "name"-submenu, which will
    // be added in the next step.
    template[0].submenu.push({
        type: 'separator',
    },{
        label: trans(global.i18n.menu.preferences),
        accelerator: 'CmdOrCtrl+,',
        click (item, focusedWindow) {
            if(focusedWindow) focusedWindow.webContents.send('message', {'command': 'open-preferences'});
        }
    },
    { type: 'separator' },
    { label: trans(global.i18n.menu.quit), role: 'quit' });
}

if (process.platform === 'darwin') {
    const name = app.getName();
    template.unshift({
        label: name, // This will be only set on macOS if dedicated binary
        submenu: [
            { label: trans(global.i18n.menu.about, name), role: 'about' },
            {
                label: trans(global.i18n.menu.preferences),
                accelerator: 'CmdOrCtrl+,',
                click (item, focusedWindow) {
                    if(focusedWindow) focusedWindow.webContents.send('message', {'command': 'open-preferences'});
                }
            },
            { type: 'separator' },
            { label: trans(global.i18n.menu.services), role: 'services', submenu: [] },
            { type: 'separator' },
            { label: trans(global.i18n.menu.hide), role: 'hide' },
            { label: trans(global.i18n.menu.hide_others), role: 'hideothers' },
            { label: trans(global.i18n.menu.unhide), role: 'unhide' },
            { type: 'separator' },
            { label: trans(global.i18n.menu.quit), role: 'quit' }
        ]
    });
    // Edit menu.
    template[2].submenu.push(
        { type: 'separator' },
        {
            label: trans(global.i18n.menu.speech),
            submenu: [
                { label: trans(global.i18n.menu.start_speaking), role: 'startspeaking' },
                { label: trans(global.i18n.menu.stop_speaking), role: 'stopspeaking' }
            ]
        }
    )
    // Window menu.
    template[4].submenu = [
        {
            label: trans(global.i18n.menu.win_close),
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
        },
        {
            label: trans(global.i18n.menu.win_minimize),
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
        },
        { label: trans(global.i18n.menu.zoom), role: 'zoom' },
        { type: 'separator' },
        { label: trans(global.i18n.menu.all_front), role: 'front' }
    ]
}

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
