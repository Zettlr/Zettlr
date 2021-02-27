import { app, MenuItemConstructorOptions, shell } from 'electron'
import { trans } from '../../../common/i18n'
import path from 'path'

export default function getMenu (): MenuItemConstructorOptions[] {
  // Prepare the dynamically generated recent documents menu item
  const recentDocsItem: MenuItemConstructorOptions = {
    id: 'menu.recent_docs',
    label: trans('menu.recent_docs'),
    submenu: [{
      id: 'menu.clear_recent_docs',
      label: trans('menu.clear_recent_docs'),
      enabled: global.recentDocs.hasDocs(),
      click: (menuitem, focusedWindow) => {
        global.recentDocs.clear()
      }
    }]
  }

  if (global.recentDocs.hasDocs() &&
    // TypeScript can be a pain in the ass sometimes
    recentDocsItem.submenu !== undefined &&
    Array.isArray(recentDocsItem.submenu)
  ) {
    recentDocsItem.submenu.push({
      type: 'separator'
    })

    for (const recent of global.recentDocs.get().slice(0, 10)) {
      recentDocsItem.submenu.push({
        id: recent.name,
        label: recent.name,
        click: function (menuitem, focusedWindow) {
          // TODO: Run open command on the application
        }
      })
    }
  }

  const menu: MenuItemConstructorOptions[] = [
    // APP MENU
    {
      id: 'app-menu',
      label: 'Zettlr',
      submenu: [
        {
          id: 'macos-about',
          label: trans('menu.about'),
          role: 'about'
        },
        {
          id: 'menu.preferences',
          label: trans('menu.preferences'),
          accelerator: 'Cmd+,',
          click: function (menuitem, focusedWindow) {
            global.application.showPreferences()
          }
        },
        {
          id: 'menu.pdf_preferences',
          label: trans('menu.pdf_preferences'),
          accelerator: 'Cmd+Alt+,' // ,
          // command: 'open-pdf-preferences' TODO
        },
        {
          id: 'menu.tags',
          label: trans('menu.tags'),
          click: function (menuitem, focusedWindow) {
            global.application.showTagManager()
          }
        },
        {
          id: 'menu.custom_css',
          label: trans('menu.custom_css'),
          click: function (menuitem, focusedWindow) {
            global.application.showCustomCSS()
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.services',
          label: trans('menu.services'),
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.hide',
          label: trans('menu.hide'),
          role: 'hide'
        },
        {
          id: 'menu.hide_others',
          label: trans('menu.hide_others'),
          role: 'hideOthers'
        },
        {
          id: 'menu.unhide',
          label: trans('menu.unhide'),
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-quit',
          label: trans('menu.quit'),
          accelerator: 'Cmd+Q',
          role: 'quit'
        }
      ]
    },
    // FILE MENU
    {
      id: 'file-menu',
      label: trans('menu.labels.file'),
      submenu: [
        {
          id: 'menu.new_file',
          label: trans('menu.new_file'),
          accelerator: 'Cmd+N' // ,
          // command: 'file-new' TODO
        },
        {
          id: 'menu.new_dir',
          label: trans('menu.new_dir'),
          accelerator: 'Cmd+Shift+N' // ,
          // command: 'dir-new' TODO
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.open',
          label: trans('menu.open'),
          accelerator: 'Cmd+O',
          click: function (menuitem, focusedWindow) {
            global.application.runCommand('open-file')
              .catch(e => global.log.error(String(e.message), e))
          }
        },
        {
          id: 'menu.open_workspace',
          label: trans('menu.open_workspace'),
          accelerator: 'Cmd+Shift+O',
          click: function (menuitem, focusedWindow) {
            global.application.runCommand('open-workspace')
              .catch(e => global.log.error(String(e.message), e))
          }
        },
        {
          id: 'menu.save',
          label: trans('menu.save'),
          accelerator: 'Cmd+S',
          click: function (menuItem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'save-file')
          }
        },
        recentDocsItem,
        {
          type: 'separator'
        },
        {
          id: 'menu.import_files',
          label: trans('menu.import_files'),
          click: function (menuItem, focusedWindow) {
            global.application.runCommand('import-files')
              .catch(e => global.log.error('[Menu Provider] Cannot import files', e))
          }
        },
        {
          id: 'menu.export',
          label: trans('menu.export'),
          accelerator: 'Cmd+E' // ,
          // command: 'export' TODO
        },
        {
          id: 'menu.print',
          label: trans('menu.print'),
          accelerator: 'Cmd+P' // ,
          // command: 'print' TODO
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.import_lang_file',
          label: trans('menu.import_lang_file') // ,
          // command: 'import-lang-file'
        },
        {
          id: 'menu.import_dict_file',
          label: trans('menu.import_dict_file'),
          click: function (menuitem, focusedWindow) {
            const msg = '[Menu Provider] Could not open dictionary directory: '
            shell.openPath(path.join(app.getPath('userData'), '/dict'))
              .then(potentialError => {
                if (potentialError !== '') {
                  global.log.error(msg + potentialError)
                }
              })
              .catch(err => {
                global.log.error(msg + String(err.message), err)
              })
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.rename_file',
          label: trans('menu.rename_file'),
          accelerator: 'Cmd+R' // ,
          // command: 'file-rename' TODO
        },
        {
          id: 'menu.rename_dir',
          label: trans('menu.rename_dir'),
          accelerator: 'Cmd+Shift+R' // ,
          // command: 'dir-rename'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.delete_file',
          label: trans('menu.delete_file'),
          accelerator: 'Cmd+Backspace' // ,
          // command: 'file-delete'
        },
        {
          id: 'menu.delete_dir',
          label: trans('menu.delete_dir'),
          accelerator: 'Cmd+Shift+Backspace' // ,
          // command: 'dir-delete'
        }
      ]
    },
    // EDIT MENU
    {
      id: 'edit-menu',
      label: trans('menu.labels.edit'),
      submenu: [
        {
          id: 'menu.undo',
          accelerator: 'Cmd+Z',
          label: trans('menu.undo'),
          role: 'undo'
        },
        {
          id: 'menu.redo',
          accelerator: 'Cmd+Shift+Z',
          label: trans('menu.redo'),
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.cut',
          accelerator: 'Cmd+X',
          label: trans('menu.cut'),
          role: 'cut'
        },
        {
          id: 'menu.copy',
          accelerator: 'Cmd+C',
          label: trans('menu.copy'),
          role: 'copy'
        },
        {
          id: 'menu.copy_html',
          label: trans('menu.copy_html'),
          accelerator: 'Cmd+Alt+C',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'copy-as-html')
          }
        },
        {
          id: 'menu.paste',
          accelerator: 'Cmd+V',
          label: trans('menu.paste'),
          role: 'paste'
        },
        {
          id: 'menu.paste_plain',
          label: trans('menu.paste_plain'),
          accelerator: 'Cmd+Shift+V',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'paste-as-plain')
          }
        },
        {
          id: 'menu.select_all',
          accelerator: 'Cmd+A',
          label: trans('menu.select_all'),
          role: 'selectAll'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.find_file',
          label: trans('menu.find_file'),
          accelerator: 'Cmd+F',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'search')
          }
        },
        {
          id: 'menu.find_dir',
          label: trans('menu.find_dir'),
          accelerator: 'Cmd+Shift+F' // ,
          // command: 'dir-find' TODO
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.generate_id',
          label: trans('menu.generate_id'),
          accelerator: 'Cmd+L',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'insert-id')
          }
        },
        {
          id: 'menu.copy_id',
          label: trans('menu.copy_id'),
          accelerator: 'Cmd+Shift+L',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'copy-current-id')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.speech',
          label: trans('menu.speech'),
          submenu: [
            {
              id: 'menu.start_speaking',
              label: trans('menu.start_speaking'),
              role: 'startSpeaking'
            },
            {
              id: 'menu.stop_speaking',
              label: trans('menu.stop_speaking'),
              role: 'stopSpeaking'
            }
          ]
        }
      ]
    },
    // VIEW MENU
    {
      id: 'view-menu',
      label: trans('menu.labels.view'),
      submenu: [
        {
          id: 'menu.toggle_theme',
          label: trans('menu.toggle_theme'),
          accelerator: 'Cmd+Alt+L',
          type: 'checkbox',
          checked: global.config.get('darkMode'),
          click: function (menuitem, focusedWindow) {
            global.config.set('darkMode', global.config.get('darkMode') === false)
          }
        },
        {
          id: 'menu.toggle_file_meta',
          label: trans('menu.toggle_file_meta'),
          accelerator: 'Cmd+Alt+S',
          type: 'checkbox',
          checked: global.config.get('fileMeta'),
          click: function (menuitem, focusedWindow) {
            global.config.set('fileMeta', global.config.get('fileMeta') === false)
          }
        },
        {
          id: 'menu.toggle_distraction_free',
          label: trans('menu.toggle_distraction_free'),
          accelerator: 'Cmd+J',
          type: 'checkbox',
          checked: false // , // TODO
          // command: 'toggle-distraction-free'
        },
        {
          id: 'menu.toggle_typewriter_mode',
          label: trans('menu.toggle_typewriter_mode'),
          accelerator: 'Cmd+Alt+T',
          type: 'checkbox',
          checked: false // , TODO
          // command: 'toggle-typewriter-mode'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.toggle_filemanager',
          label: trans('menu.toggle_filemanager'),
          accelerator: 'Cmd+!' // ,
          // command: 'toggle-file-manager' TODO
        },
        {
          id: 'menu.toggle_sidebar',
          label: trans('menu.toggle_sidebar'),
          accelerator: 'Cmd+?',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'toggle-sidebar')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.reset_zoom',
          label: trans('menu.reset_zoom'),
          accelerator: 'Cmd+0',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'zoom-reset')
          }
        },
        {
          id: 'menu.zoom_in',
          label: trans('menu.zoom_in'),
          accelerator: 'Cmd+Plus',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'zoom-in')
          }
        },
        {
          id: 'menu.zoom_out',
          label: trans('menu.zoom_out'),
          accelerator: 'Cmd+-',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'zoom-out')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.toggle_fullscreen',
          label: trans('menu.toggle_fullscreen'),
          role: 'togglefullscreen'
        }
      ]
    },
    // debug MENU
    {
      id: 'debug-menu',
      label: trans('menu.labels.debug'),
      submenu: [
        {
          id: 'menu.inspect_clipboard',
          label: trans('menu.inspect_clipboard') // ,
          // command: 'inspect-clipboard' TODO
        },
        {
          id: 'menu.reload',
          label: trans('menu.reload'),
          accelerator: 'F5',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.reload()
          }
        },
        {
          id: 'menu.toggle_devtools',
          label: trans('menu.toggle_devtools'),
          accelerator: 'Cmd+Alt+I',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.toggleDevTools()
          }
        },
        {
          id: 'menu.open_logs',
          label: trans('menu.open_logs'),
          accelerator: 'Cmd+Alt+Shift+L',
          click: function (menuitem, focusedWindow) {
            global.application.showLogViewer()
          }
        }
      ]
    },
    // WINDOW MENU
    {
      id: 'window-menu',
      label: trans('menu.labels.window'),
      role: 'window',
      submenu: [
        {
          id: 'menu.win_minimize',
          label: trans('menu.win_minimize'),
          accelerator: 'Cmd+M',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.minimize()
          }
        },
        {
          id: 'menu.win_close',
          label: trans('menu.win_close'),
          accelerator: 'Cmd+Shift+W',
          role: 'close'
        },
        {
          id: 'menu.all_front',
          label: trans('menu.all_front'),
          role: 'front'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.tab_close',
          label: trans('menu.tab_close'),
          accelerator: 'Cmd+W',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'close-window')
          }
        },
        {
          id: 'menu.tab_previous',
          label: trans('menu.tab_previous'),
          accelerator: 'Ctrl+Shift+Tab',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'previous-tab')
          }
        },
        {
          id: 'menu.tab_next',
          label: trans('menu.tab_next'),
          accelerator: 'Ctrl+Tab',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'next-tab')
          }
        }
      ]
    },
    // HELP MENU
    {
      id: 'help-menu',
      label: trans('menu.labels.help'),
      role: 'help',
      submenu: [
        {
          id: 'menu.about',
          label: trans('menu.about'),
          click: function (menuitem, focusedWindow) {
            global.application.showAboutWindow()
          }
        },
        {
          id: 'menu.donate',
          label: trans('menu.donate'),
          click: function (menuitem, focusedWindow) {
            const target = 'https://patreon.com/zettlr'
            shell.openExternal(target).catch(e => {
              global.log.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.learn_more',
          label: trans('menu.learn_more'),
          click: function (menuitem, focusedWindow) {
            const target = 'https://www.zettlr.com/'
            shell.openExternal(target).catch(e => {
              global.log.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.latex',
          label: trans('menu.latex'),
          click: function (menuitem, focusedWindow) {
            const target = 'https://www.latex-project.org/get/#tex-distributions'
            shell.openExternal(target).catch(e => {
              global.log.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.docs',
          label: trans('menu.docs'),
          accelerator: 'F1',
          click: function (menuitem, focusedWindow) {
            const target = 'https://docs.zettlr.com/'
            shell.openExternal(target).catch(e => {
              global.log.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.update',
          label: trans('menu.update') // ,
          // command: 'update-check' TODO
        }
      ]
    }
  ]

  // Finally, before returning, make sure to remove the debug menu if applicable
  if (global.config.get('debug') === false) {
    menu.splice(4, 1)
  }

  return menu
}
