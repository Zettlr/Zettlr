/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Menu constructor for Windows
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exposes a getMenu function returning the Windows
 *                  application menu. NOTE that this menu is also used by all
 *                  non-darwin platforms currently, so it really is cross-platform.
 *
 * END HEADER
 */

import { app, MenuItemConstructorOptions, shell } from 'electron'
import { trans } from '../../../common/i18n-main'
import path from 'path'

export default function getMenu (
  getCheckboxState: (id: string, init: boolean) => boolean,
  setCheckboxState: (id: string, val: boolean) => void
): MenuItemConstructorOptions[] {
  // While on macOS we can just drop the following menuItem into the menu, the
  // win32-menu is also being used on Linux. Therefore, we use as fallback the
  // default, but ...
  let recentDocsItem: MenuItemConstructorOptions = {
    id: 'menu.recent_docs',
    label: trans('menu.recent_docs'),
    role: 'recentDocuments',
    submenu: [{
      id: 'menu.clear_recent_docs',
      label: trans('menu.clear_recent_docs'),
      role: 'clearRecentDocuments'
    }]
  }

  // ... if we're somewhere else, display our custom implementation of recent docs.
  if (process.platform !== 'win32') {
    const docs = global.recentDocs.get()
    recentDocsItem = {
      id: 'menu.recent_docs',
      label: trans('menu.recent_docs'),
      submenu: [
        {
          id: 'menu.clear_recent_docs',
          label: trans('menu.clear_recent_docs'),
          click: function (menuitem, focusedWindow) {
            global.recentDocs.clear()
          },
          enabled: docs.length > 0
        },
        ...docs.map(item => {
          const ret: MenuItemConstructorOptions = {
            label: path.basename(item),
            click: function (menuitem, focusedWindow) {
              global.application.runCommand('open-file', {
                path: item,
                newTab: true
              }).catch((e: any) => global.log.error(`[Menu] Could not open recent document ${item}`, e))
            }
          }

          return ret
        })
      ]
    }
  }

  const menu: MenuItemConstructorOptions[] = [
    // FILE MENU
    {
      id: 'file-menu',
      label: trans('menu.labels.file'),
      submenu: [
        {
          label: trans('menu.new_file'),
          submenu: [
            {
              id: 'menu.new_file',
              label: 'Markdown', // TODO: Translate
              accelerator: 'Ctrl+N',
              click: function (menuitem, focusedWindow) {
                global.application.runCommand('new-unsaved-file', { type: 'md' })
                  .catch(e => global.log.error(String(e.message), e))
              }
            },
            {
              id: 'menu.new_tex_file',
              label: 'TeX', // TODO: Translate
              click: function (menuitem, focusedWindow) {
                global.application.runCommand('new-unsaved-file', { type: 'tex' })
                  .catch(e => global.log.error(String(e.message), e))
              }
            },
            {
              id: 'menu.new_yaml_file',
              label: 'YAML', // TODO: Translate
              click: function (menuitem, focusedWindow) {
                global.application.runCommand('new-unsaved-file', { type: 'yaml' })
                  .catch(e => global.log.error(String(e.message), e))
              }
            },
            {
              id: 'menu.new_json_file',
              label: 'JSON', // TODO: Translate
              click: function (menuitem, focusedWindow) {
                global.application.runCommand('new-unsaved-file', { type: 'json' })
                  .catch(e => global.log.error(String(e.message), e))
              }
            }
          ]
        },
        {
          id: 'menu.new_dir',
          label: trans('menu.new_dir'),
          accelerator: 'Ctrl+Shift+N',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'new-dir')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.open',
          label: trans('menu.open'),
          accelerator: 'Ctrl+O',
          click: function (menuitem, focusedWindow) {
            global.application.runCommand('open-root-file')
              .catch(e => global.log.error(String(e.message), e))
          }
        },
        {
          id: 'menu.open_workspace',
          label: trans('menu.open_workspace'),
          accelerator: 'Ctrl+Shift+O',
          click: function (menuitem, focusedWindow) {
            global.application.runCommand('open-workspace')
              .catch(e => global.log.error(String(e.message), e))
          }
        },
        recentDocsItem,
        {
          type: 'separator'
        },
        {
          id: 'menu.save',
          label: trans('menu.save'),
          accelerator: 'Ctrl+S',
          click: function (menuItem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'save-file')
          }
        },
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
          accelerator: 'Ctrl+E',
          click: function (menuItem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'export')
          }
        },
        {
          id: 'menu.print',
          label: trans('menu.print'),
          accelerator: 'Ctrl+P',
          click: function (menuItem, focusedWindow) {
            global.application.runCommand('print')
              .catch(e => global.log.error(String(e.message), e))
          }
        },
        {
          id: 'menu.preferences',
          label: trans('menu.preferences'),
          submenu: [
            {
              id: 'preferences-item',
              label: trans('menu.preferences'),
              accelerator: 'Ctrl+,',
              click: function (menuitem, focusedWindow) {
                global.application.showPreferences()
              }
            },
            {
              id: 'menu.assets_manager',
              label: trans('menu.assets_manager'),
              accelerator: 'Ctrl+Alt+,',
              click: function (menuitem, focusedWindow) {
                global.application.showDefaultsPreferences()
              }
            },
            {
              id: 'menu.tags',
              label: trans('menu.tags'),
              click: function (menuitem, focusedWindow) {
                global.application.showTagManager()
              }
            }
          ]
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.import_lang_file',
          label: trans('menu.import_lang_file'),
          click: function (menuItem, focusedWindow) {
            global.application.runCommand('import-lang-file')
              .catch(e => global.log.error('[Menu Provider] Cannot import translation', e))
          }
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
          accelerator: 'Ctrl+R',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'rename-file')
          }
        },
        {
          id: 'menu.rename_dir',
          label: trans('menu.rename_dir'),
          accelerator: 'Ctrl+Shift+R',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'rename-dir')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.delete_file',
          label: trans('menu.delete_file'),
          accelerator: 'Delete',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'delete-file')
          }
        },
        {
          id: 'menu.delete_dir',
          label: trans('menu.delete_dir'),
          accelerator: 'Ctrl+Delete',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'delete-dir')
          }
        },
        {
          type: 'separator'
        },
        {
          label: trans('menu.quit'),
          id: 'menu-quit',
          accelerator: 'Ctrl+Q',
          role: 'quit'
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
          accelerator: 'Ctrl+Z',
          label: trans('menu.undo'),
          role: 'undo'
        },
        {
          id: 'menu.redo',
          accelerator: 'Ctrl+Shift+Z',
          label: trans('menu.redo'),
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.cut',
          accelerator: 'Ctrl+X',
          label: trans('menu.cut'),
          role: 'cut'
        },
        {
          id: 'menu.copy',
          accelerator: 'Ctrl+C',
          label: trans('menu.copy'),
          role: 'copy'
        },
        {
          id: 'menu.copy_html',
          label: trans('menu.copy_html'),
          accelerator: 'Ctrl+Alt+C',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'copy-as-html')
          }
        },
        {
          id: 'menu.paste',
          accelerator: 'Ctrl+V',
          label: trans('menu.paste'),
          role: 'paste'
        },
        {
          id: 'menu.paste_plain',
          label: trans('menu.paste_plain'),
          accelerator: 'Ctrl+Shift+V',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'paste-as-plain')
          }
        },
        {
          id: 'menu.select_all',
          accelerator: 'Ctrl+A',
          label: trans('menu.select_all'),
          role: 'selectAll'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.find_file',
          label: trans('menu.find_file'),
          accelerator: 'Ctrl+F',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'search')
          }
        },
        {
          id: 'menu.find_dir',
          label: trans('menu.find_dir'),
          accelerator: 'Ctrl+Shift+F',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'global-search')
          }
        },
        {
          id: 'menu.filter_files',
          label: trans('menu.filter_files'),
          accelerator: 'Ctrl+Shift+T',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'filter-files')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.generate_id',
          label: trans('menu.generate_id'),
          accelerator: 'Ctrl+L',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'insert-id')
          }
        },
        {
          id: 'menu.copy_id',
          label: trans('menu.copy_id'),
          accelerator: 'Ctrl+Shift+L',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'copy-current-id')
          }
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
          label: trans('dialog.preferences.dark_mode'),
          accelerator: 'Ctrl+Alt+L',
          type: 'checkbox',
          checked: global.config.get('darkMode'),
          click: function (menuitem, focusedWindow) {
            global.config.set('darkMode', global.config.get('darkMode') === false)
          }
        },
        {
          id: 'menu.toggle_file_meta',
          label: trans('menu.toggle_file_meta'),
          accelerator: 'Ctrl+Alt+S',
          type: 'checkbox',
          checked: global.config.get('fileMeta'),
          click: function (menuitem, focusedWindow) {
            global.config.set('fileMeta', global.config.get('fileMeta') === false)
          }
        },
        {
          id: 'menu.toggle_distraction_free',
          label: trans('menu.toggle_distraction_free'),
          accelerator: 'Ctrl+J',
          type: 'checkbox',
          checked: getCheckboxState('menu.toggle_distraction_free', false),
          click: function (menuitem, focusedWindow) {
            const currentState = getCheckboxState('menu.toggle_distraction_free', false)
            setCheckboxState('menu.toggle_distraction_free', !currentState)
            focusedWindow?.webContents.send('shortcut', 'toggle-distraction-free' /*, menuitem.checked */)
          }
        },
        {
          id: 'menu.toggle_typewriter_mode',
          label: trans('menu.toggle_typewriter_mode'),
          accelerator: 'Ctrl+Alt+T',
          type: 'checkbox',
          checked: getCheckboxState('menu.toggle_typewriter_mode', false),
          click: function (menuitem, focusedWindow) {
            const currentState = getCheckboxState('menu.toggle_typewriter_mode', false)
            setCheckboxState('menu.toggle_typewriter_mode', !currentState)
            focusedWindow?.webContents.send('shortcut', 'toggle-typewriter-mode')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.toggle_filemanager',
          label: trans('menu.toggle_filemanager'),
          accelerator: 'Ctrl+!',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'toggle-file-manager')
          }
        },
        {
          id: 'menu.toggle_sidebar',
          label: trans('menu.toggle_sidebar'),
          accelerator: 'Ctrl+?',
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
          accelerator: 'Ctrl+0',
          role: 'resetZoom'
        },
        {
          id: 'menu.zoom_in',
          label: trans('menu.zoom_in'),
          accelerator: 'Ctrl+Plus',
          role: 'zoomIn'
        },
        {
          id: 'menu.zoom_out',
          label: trans('menu.zoom_out'),
          accelerator: 'Ctrl+-',
          role: 'zoomOut'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.toggle_fullscreen',
          label: trans('menu.toggle_fullscreen'),
          accelerator: 'F11',
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
          accelerator: 'Ctrl+Alt+I',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.toggleDevTools()
          }
        },
        {
          id: 'menu.open_logs',
          label: trans('menu.open_logs'),
          accelerator: 'Ctrl+Alt+Shift+L',
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
          accelerator: 'Ctrl+M',
          role: 'minimize'
        },
        {
          id: 'menu.win_close',
          label: trans('menu.win_close'),
          accelerator: 'Ctrl+Shift+W',
          role: 'close'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.tab_close',
          label: trans('menu.tab_close'),
          accelerator: 'Ctrl+W',
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
          label: trans('menu.update'),
          click: function (menuitem, focusedWindow) {
            // Immediately open the window instead of first checking
            global.application.runCommand('open-update-window')
              .catch(e => global.log.error(String(e.message), e))
          }
        }
      ]
    }
  ]

  // Finally, before returning, make sure to remove the debug menu if applicable
  if (global.config.get('debug') === false) {
    menu.splice(3, 1)
  }

  return menu
}
