/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Menu constructor for macOS
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exposes a getMenu function returning the macOS application menu.
 *
 * END HEADER
 */

import { app, type MenuItemConstructorOptions, shell, dialog, type BrowserWindow } from 'electron'
import { trans } from '@common/i18n-main'
import path from 'path'
import type RecentDocumentsProvider from '@providers/recent-docs'
import type WindowProvider from '@providers/windows'
import type CommandProvider from '@providers/commands'
import type LogProvider from '@providers/log'
import { zoomIn, zoomOut } from './font-zoom'
import type ConfigProvider from '@providers/config'
import type DocumentManager from '@providers/documents'

export default function getMenu (
  logger: LogProvider,
  config: ConfigProvider,
  _recentDocs: RecentDocumentsProvider,
  commands: CommandProvider,
  windows: WindowProvider,
  documents: DocumentManager,
  _getCheckboxState: (id: string, init: boolean) => boolean,
  _setCheckboxState: (id: string, val: boolean) => void
): MenuItemConstructorOptions[] {
  const useGuiZoom = config.get('system.zoomBehavior') === 'gui'

  const menu: MenuItemConstructorOptions[] = [
    // APP MENU
    {
      id: 'app-menu',
      label: 'Zettlr',
      submenu: [
        {
          id: 'macos-about',
          label: trans('About Zettlr'),
          role: 'about'
        },
        {
          id: 'menu.preferences',
          label: trans('Preferences…'),
          accelerator: 'Cmd+,',
          click: function (_menuitem, _focusedWindow) {
            windows.showPreferences()
          }
        },
        {
          id: 'menu.assets_manager',
          label: trans('Assets Manager'),
          accelerator: 'Cmd+Alt+,',
          click: function (_menuitem, _focusedWindow) {
            windows.showDefaultsWindow()
          }
        },
        {
          id: 'menu.tags',
          label: trans('Tags Manager'),
          click: function (_menuitem, _focusedWindow) {
            windows.showTagManager()
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.services',
          label: trans('Services'),
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.hide',
          label: trans('Hide'),
          role: 'hide'
        },
        {
          id: 'menu.hide_others',
          label: trans('Hide others'),
          role: 'hideOthers'
        },
        {
          id: 'menu.unhide',
          label: trans('Show'),
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu-quit',
          label: trans('Quit'),
          accelerator: 'Cmd+Q',
          role: 'quit'
        }
      ]
    },
    // FILE MENU
    {
      id: 'file-menu',
      label: trans('File'),
      submenu: [
        {
          label: trans('New file…'),
          submenu: [
            {
              id: 'menu.new_file',
              label: 'Markdown',
              accelerator: 'Cmd+N',
              click: function (_menuitem, _focusedWindow) {
                commands.run('file-new', { type: 'md' })
                  .catch(e => logger.error(String(e.message), e))
              }
            },
            {
              id: 'menu.new_tex_file',
              label: 'TeX',
              click: function (_menuitem, _focusedWindow) {
                commands.run('file-new', { type: 'tex' })
                  .catch(e => logger.error(String(e.message), e))
              }
            },
            {
              id: 'menu.new_yaml_file',
              label: 'YAML',
              click: function (_menuitem, _focusedWindow) {
                commands.run('file-new', { type: 'yaml' })
                  .catch(e => logger.error(String(e.message), e))
              }
            },
            {
              id: 'menu.new_json_file',
              label: 'JSON',
              click: function (_menuitem, _focusedWindow) {
                commands.run('file-new', { type: 'json' })
                  .catch(e => logger.error(String(e.message), e))
              }
            }
          ]
        },
        {
          id: 'menu.new_dir',
          label: trans('New directory…'),
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'new-dir')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.open',
          label: trans('Open file…'),
          accelerator: 'Cmd+O',
          click: function (_menuitem, _focusedWindow) {
            commands.run('root-open-files', [])
              .catch(e => logger.error(String(e.message), e))
          }
        },
        {
          id: 'menu.open_workspace',
          label: trans('Open workspace…'),
          accelerator: 'Cmd+Shift+O',
          click: function (_menuitem, _focusedWindow) {
            commands.run('root-open-workspaces', [])
              .catch(e => logger.error(String(e.message), e))
          }
        },
        {
          id: 'menu.recent_docs',
          label: trans('Recent files'),
          role: 'recentDocuments',
          submenu: [{
            id: 'menu.clear_recent_docs',
            label: trans('Clear'),
            role: 'clearRecentDocuments'
          }]
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.save',
          label: trans('Save'),
          accelerator: 'Cmd+S',
          click: function (_menuItem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'save-file')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.previous_file',
          label: trans('Previous file'),
          accelerator: 'Cmd+[',
          click: function (_menuitem, _focusedWindow) {
            commands.run('previous-file', undefined)
              .catch(e => {
                logger.error(`[Menu] Error selecting previous file: ${e.message as string}`, e)
              })
          }
        },
        {
          id: 'menu.next_file',
          label: trans('Next file'),
          accelerator: 'Cmd+]',
          click: function (_menuitem, _focusedWindow) {
            commands.run('next-file', undefined)
              .catch(e => {
                logger.error(`[Menu] Error selecting next file: ${e.message as string}`, e)
              })
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.import_files',
          label: trans('Import files…'),
          click: function (_menuItem, _focusedWindow) {
            commands.run('import-files', undefined)
              .catch(e => logger.error('[Menu Provider] Cannot import files', e))
          }
        },
        {
          id: 'menu.export',
          label: trans('Export…'),
          accelerator: 'Cmd+E',
          click: function (_menuItem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'export')
          }
        },
        {
          id: 'menu.print',
          label: trans('Print…'),
          accelerator: 'Cmd+P',
          click: function (_menuItem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'print')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.import_lang_file',
          label: trans('Import translation…'),
          click: function (_menuItem, _focusedWindow) {
            commands.run('import-lang-file', undefined)
              .catch(e => logger.error('[Menu Provider] Cannot import translation', e))
          }
        },
        {
          id: 'menu.import_dict_file',
          label: trans('Import dictionary…'),
          click: function (_menuitem, _focusedWindow) {
            const msg = '[Menu Provider] Could not open dictionary directory: '
            shell.openPath(path.join(app.getPath('userData'), '/dict'))
              .then(potentialError => {
                if (potentialError !== '') {
                  logger.error(msg + potentialError)
                }
              })
              .catch(err => {
                logger.error(msg + String(err.message), err)
              })
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.rename_file',
          label: trans('Rename file'),
          accelerator: 'Cmd+R',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'rename-file')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.delete_file',
          label: trans('Delete file'),
          accelerator: 'Cmd+Backspace',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'delete-file')
          }
        }
      ]
    },
    // EDIT MENU
    {
      id: 'edit-menu',
      label: trans('Edit'),
      submenu: [
        {
          id: 'menu.undo',
          accelerator: 'Cmd+Z',
          label: trans('Undo'),
          role: 'undo'
        },
        {
          id: 'menu.redo',
          accelerator: 'Cmd+Shift+Z',
          label: trans('Redo'),
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.cut',
          accelerator: 'Cmd+X',
          label: trans('Cut'),
          role: 'cut'
        },
        {
          id: 'menu.copy',
          accelerator: 'Cmd+C',
          label: trans('Copy'),
          role: 'copy'
        },
        {
          id: 'menu.copy_html',
          label: trans('Copy as HTML'),
          accelerator: 'Cmd+Alt+C',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'copy-as-html')
          }
        },
        {
          id: 'menu.paste',
          accelerator: 'Cmd+V',
          label: trans('Paste'),
          role: 'paste'
        },
        {
          id: 'menu.paste_plain',
          label: trans('Paste without style'),
          accelerator: 'Cmd+Shift+V',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'paste-as-plain')
          }
        },
        {
          id: 'menu.select_all',
          accelerator: 'Cmd+A',
          label: trans('Select all'),
          role: 'selectAll'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.find_file',
          label: trans('Find in current file'),
          accelerator: 'Cmd+F',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'search')
          }
        },
        {
          id: 'menu.find_dir',
          label: trans('Search all files'),
          accelerator: 'Cmd+Shift+F',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'global-search')
          }
        },
        {
          id: 'menu.filter_files',
          label: trans('Filter files'),
          accelerator: 'Cmd+Shift+T',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'filter-files')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.generate_id',
          label: trans('Generate new ID'),
          accelerator: 'Cmd+L',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'insert-id')
          }
        },
        {
          id: 'menu.copy_id',
          label: trans('Copy ID'),
          accelerator: 'Cmd+Shift+L',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'copy-current-id')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.speech',
          label: trans('Speech'),
          submenu: [
            {
              id: 'menu.start_speaking',
              label: trans('Start speaking'),
              role: 'startSpeaking'
            },
            {
              id: 'menu.stop_speaking',
              label: trans('Stop speaking'),
              role: 'stopSpeaking'
            }
          ]
        }
      ]
    },
    // VIEW MENU
    {
      id: 'view-menu',
      label: trans('View'),
      submenu: [
        {
          id: 'menu.toggle_theme',
          label: trans('Dark mode'),
          accelerator: 'Cmd+Alt+L',
          type: 'checkbox',
          checked: config.get('darkMode'),
          click: function (_menuitem, _focusedWindow) {
            config.set('darkMode', config.get('darkMode') === false)
          }
        },
        {
          id: 'menu.toggle_file_meta',
          label: trans('Additional information'),
          accelerator: 'Cmd+Alt+S',
          type: 'checkbox',
          checked: config.get('fileMeta'),
          click: function (_menuitem, _focusedWindow) {
            config.set('fileMeta', config.get('fileMeta') === false)
          }
        },
        {
          id: 'menu.toggle_distraction_free',
          label: trans('Distraction-free mode'),
          accelerator: 'Cmd+J',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'toggle-distraction-free')
          }
        },
        {
          id: 'menu.toggle_typewriter_mode',
          label: trans('Typewriter mode'),
          accelerator: 'Cmd+Alt+T',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'toggle-typewriter-mode')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.toggle_filemanager',
          label: trans('Toggle File Manager'),
          accelerator: 'Cmd+!',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'toggle-file-manager')
          }
        },
        {
          id: 'menu.toggle_sidebar',
          label: trans('Toggle Sidebar'),
          accelerator: 'Cmd+Shift+0',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'toggle-sidebar')
          }
        },
        {
          type: 'separator'
        },
        // The Zoom menu items can be changed in function between GUI zooming
        // (using the zoom roles) and editor font size zooming (using a custom
        // callback)
        {
          id: 'menu.reset_zoom',
          label: trans('Reset zoom'),
          accelerator: 'Cmd+0',
          // NOTE: Since the base font-size can change, resetting the editor
          // font size zoom level is not semantically meaningful
          enabled: useGuiZoom,
          role: (useGuiZoom) ? 'resetZoom' : undefined
        },
        {
          id: 'menu.zoom_in',
          label: trans('Zoom in'),
          accelerator: 'Cmd+Plus',
          role: (useGuiZoom) ? 'zoomIn' : undefined,
          click: (useGuiZoom) ? undefined : zoomIn(config)
        },
        {
          id: 'menu.zoom_out',
          label: trans('Zoom out'),
          accelerator: 'Cmd+-',
          role: (useGuiZoom) ? 'zoomOut' : undefined,
          click: (useGuiZoom) ? undefined : zoomOut(config)
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.toggle_fullscreen',
          label: trans('Toggle fullscreen'),
          role: 'togglefullscreen'
        }
      ]
    },
    // DEVELOP MENU
    {
      id: 'debug-menu',
      label: trans('Develop'),
      submenu: [
        {
          id: 'menu.reload',
          label: trans('Reload'),
          accelerator: 'F5',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.reload()
          }
        },
        {
          id: 'menu.toggle_devtools',
          label: trans('Toggle developer tools'),
          accelerator: 'Cmd+Alt+I',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.toggleDevTools()
          }
        },
        {
          id: 'menu.open_logs',
          label: trans('View logs'),
          accelerator: 'Cmd+Alt+Shift+L',
          click: function (_menuitem, _focusedWindow) {
            windows.showLogWindow()
          }
        }
      ]
    },
    // WINDOW MENU
    {
      id: 'window-menu',
      label: trans('Window'),
      role: 'window',
      submenu: [
        {
          id: 'menu.win_minimize',
          label: trans('Minimize'),
          accelerator: 'Cmd+M',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.minimize()
          }
        },
        {
          id: 'menu.win_close',
          label: trans('Close'),
          accelerator: 'Cmd+Shift+W',
          role: 'close'
        },
        {
          id: 'menu.all_front',
          label: trans('Bring All to Front'),
          role: 'front'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.tab_close',
          label: trans('Close Tab'),
          accelerator: 'Cmd+W',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'close-window')
          }
        },
        {
          id: 'menu.tab_previous',
          label: trans('Previous Tab'),
          accelerator: 'Ctrl+Shift+Tab',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'previous-tab')
          }
        },
        {
          id: 'menu.tab_next',
          label: trans('Next Tab'),
          accelerator: 'Ctrl+Tab',
          click: function (_menuitem, focusedWindow) {
            (focusedWindow as BrowserWindow|undefined)?.webContents.send('shortcut', 'next-tab')
          }
        },
        {
          id: 'menu.new_window',
          label: trans('New window'),
          accelerator: 'CmdOrCtrl+Shift+N',
          click: function (_menuItem, _focusedWindow) {
            documents.newWindow()
          }
        }
      ]
    },
    // HELP MENU
    {
      id: 'help-menu',
      label: trans('Help'),
      role: 'help',
      submenu: [
        {
          id: 'menu.about',
          label: trans('About Zettlr'),
          click: function (_menuitem, _focusedWindow) {
            windows.showAboutWindow()
          }
        },
        {
          id: 'menu.update',
          label: trans('Check for updates'),
          click: function (_menuitem, _focusedWindow) {
            // Immediately open the window instead of first checking
            commands.run('open-update-window', undefined)
              .catch(e => logger.error(String(e.message), e))
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.donate',
          label: trans('Support Zettlr ↗︎'),
          click: function (_menuitem, _focusedWindow) {
            const target = 'https://patreon.com/zettlr'
            shell.openExternal(target).catch(e => {
              logger.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.learn_more',
          label: trans('Visit website ↗︎'),
          click: function (_menuitem, _focusedWindow) {
            const target = 'https://www.zettlr.com/'
            shell.openExternal(target).catch(e => {
              logger.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.docs',
          label: trans('Open user manual ↗︎'),
          accelerator: 'F1',
          click: function (_menuitem, _focusedWindow) {
            const target = 'https://docs.zettlr.com/'
            shell.openExternal(target).catch(e => {
              logger.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.open_tutorial',
          label: trans('Open tutorial'),
          click: function (_menuitem, _focusedWindow) {
            commands.run('tutorial-open', undefined)
              .catch(e => logger.error(String(e.message), e))
          }
        },
        {
          id: 'menu.clear_fsal_cache',
          label: trans('Clear FSAL cache…'),
          click: function (_menuitem, _focusedWindow) {
            // Clearing the FSAL cache requires a restart -> prompt the user
            dialog.showMessageBox({
              title: trans('Clear FSAL Cache'),
              message: trans('Clearing the FSAL cache requires a restart.'),
              detail: trans('After the restart, Zettlr will recreate the entire cache, which may take a few moments, depending on the amount of files you have loaded and the speed of your disk. The window(s) will show afterward.'),
              type: 'question',
              buttons: [
                trans('Restart now'),
                trans('Cancel')
              ],
              defaultId: 0,
              cancelId: 1
            })
              .then(result => {
                if (result.response === 1) {
                  return
                }

                app.relaunch({ args: process.argv.slice(1).concat(['--clear-cache']) })
                app.quit()
              })
              .catch(err => logger.error(err.message, err))
          }
        }
      ]
    }
  ]

  // Finally, before returning, make sure to remove the debug menu if applicable
  if (config.get('debug') === false) {
    menu.splice(4, 1)
  }

  return menu
}
