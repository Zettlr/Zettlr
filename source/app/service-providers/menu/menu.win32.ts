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
import { trans } from '@common/i18n-main'
import path from 'path'
import RecentDocumentsProvider from '@providers/recent-docs'
import WindowProvider from '@providers/windows'
import CommandProvider from '@providers/commands'
import LogProvider from '@providers/log'
import { zoomIn, zoomOut } from './font-zoom'
import ConfigProvider from '@providers/config'

export default function getMenu (
  logger: LogProvider,
  config: ConfigProvider,
  recentDocs: RecentDocumentsProvider,
  commands: CommandProvider,
  windows: WindowProvider,
  getCheckboxState: (id: string, init: boolean) => boolean,
  setCheckboxState: (id: string, val: boolean) => void
): MenuItemConstructorOptions[] {
  const useGuiZoom = config.get('system.zoomBehavior') === 'gui'
  // While on macOS we can just drop the following menuItem into the menu, the
  // win32-menu is also being used on Linux. Therefore, we use as fallback the
  // default, but ...
  let recentDocsItem: MenuItemConstructorOptions = {
    id: 'menu.recent_docs',
    label: trans('Recent documents'),
    role: 'recentDocuments',
    submenu: [{
      id: 'menu.clear_recent_docs',
      label: trans('Empty'),
      role: 'clearRecentDocuments'
    }]
  }

  const docs = recentDocs.get()
  recentDocsItem = {
    id: 'menu.recent_docs',
    label: trans('Recent documents'),
    submenu: [
      {
        id: 'menu.clear_recent_docs',
        label: trans('Empty'),
        click: function (menuitem, focusedWindow) {
          recentDocs.clear()
        },
        enabled: docs.length > 0
      },
      ...docs.map(item => {
        const ret: MenuItemConstructorOptions = {
          id: 'menu.recent_docs.' + item,
          label: path.basename(item),
          click: function (menuitem, focusedWindow) {
            commands.run('open-file', {
              path: item,
              newTab: true
            }).catch((e: any) => logger.error(`[Menu] Could not open recent document ${item}`, e))
          }
        }

        return ret
      })
    ]
  }

  const menu: MenuItemConstructorOptions[] = [
    // FILE MENU
    {
      id: 'file-menu',
      label: trans('File'),
      submenu: [
        {
          label: trans('New File…'),
          submenu: [
            {
              id: 'menu.new_file',
              label: 'Markdown',
              accelerator: 'Ctrl+N',
              click: function (menuitem, focusedWindow) {
                commands.run('file-new', { type: 'md' })
                  .catch(e => logger.error(String(e.message), e))
              }
            },
            {
              id: 'menu.new_tex_file',
              label: 'TeX',
              click: function (menuitem, focusedWindow) {
                commands.run('file-new', { type: 'tex' })
                  .catch(e => logger.error(String(e.message), e))
              }
            },
            {
              id: 'menu.new_yaml_file',
              label: 'YAML',
              click: function (menuitem, focusedWindow) {
                commands.run('file-new', { type: 'yaml' })
                  .catch(e => logger.error(String(e.message), e))
              }
            },
            {
              id: 'menu.new_json_file',
              label: 'JSON',
              click: function (menuitem, focusedWindow) {
                commands.run('file-new', { type: 'json' })
                  .catch(e => logger.error(String(e.message), e))
              }
            }
          ]
        },
        {
          id: 'menu.new_dir',
          label: trans('New directory…'),
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
          label: trans('Open…'),
          accelerator: 'Ctrl+O',
          click: function (menuitem, focusedWindow) {
            commands.run('root-open-files', [])
              .catch(e => logger.error(String(e.message), e))
          }
        },
        {
          id: 'menu.open_workspace',
          label: trans('Open Workspace …'),
          accelerator: 'Ctrl+Shift+O',
          click: function (menuitem, focusedWindow) {
            commands.run('root-open-workspaces', [])
              .catch(e => logger.error(String(e.message), e))
          }
        },
        recentDocsItem,
        {
          type: 'separator'
        },
        {
          id: 'menu.save',
          label: trans('Save'),
          accelerator: 'Ctrl+S',
          click: function (menuItem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'save-file')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.previous_file',
          label: trans('Previous file'),
          accelerator: 'Ctrl+[',
          click: function (menuitem, focusedWindow) {
            commands.run('previous-file', undefined)
              .catch(e => {
                logger.error(`[Menu] Error selecting previous file: ${e.message as string}`, e)
              })
          }
        },
        {
          id: 'menu.next_file',
          label: trans('Next file'),
          accelerator: 'Ctrl+]',
          click: function (menuitem, focusedWindow) {
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
          click: function (menuItem, focusedWindow) {
            commands.run('import-files', undefined)
              .catch(e => logger.error('[Menu Provider] Cannot import files', e))
          }
        },
        {
          id: 'menu.export',
          label: trans('Export…'),
          accelerator: 'Ctrl+E',
          click: function (menuItem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'export')
          }
        },
        {
          id: 'menu.print',
          label: trans('Print…'),
          accelerator: 'Ctrl+P',
          click: function (menuItem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'print')
          }
        },
        {
          id: 'menu.preferences',
          label: trans('Preferences…'),
          submenu: [
            {
              id: 'preferences-item',
              label: trans('Preferences…'),
              accelerator: 'Ctrl+,',
              click: function (menuitem, focusedWindow) {
                windows.showPreferences()
              }
            },
            {
              id: 'menu.assets_manager',
              label: trans('Assets Manager'),
              accelerator: 'Ctrl+Alt+,',
              click: function (menuitem, focusedWindow) {
                windows.showDefaultsWindow()
              }
            },
            {
              id: 'menu.tags',
              label: trans('Manage Tags…'),
              click: function (menuitem, focusedWindow) {
                windows.showTagManager()
              }
            }
          ]
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.import_lang_file',
          label: trans('Import translation…'),
          click: function (menuItem, focusedWindow) {
            commands.run('import-lang-file', undefined)
              .catch(e => logger.error('[Menu Provider] Cannot import translation', e))
          }
        },
        {
          id: 'menu.import_dict_file',
          label: trans('Import dictionary…'),
          click: function (menuitem, focusedWindow) {
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
          accelerator: 'Ctrl+R',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'rename-file')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.delete_file',
          label: trans('Delete file'),
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'delete-file')
          }
        },
        {
          id: 'menu.delete_dir',
          label: trans('Delete directory'),
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'delete-dir')
          }
        },
        {
          type: 'separator'
        },
        {
          label: trans('Quit'),
          id: 'menu-quit',
          accelerator: 'Ctrl+Q',
          role: 'quit'
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
          accelerator: 'Ctrl+Z',
          label: trans('Undo'),
          role: 'undo'
        },
        {
          id: 'menu.redo',
          accelerator: 'Ctrl+Shift+Z',
          label: trans('Redo'),
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.cut',
          accelerator: 'Ctrl+X',
          label: trans('Cut'),
          role: 'cut'
        },
        {
          id: 'menu.copy',
          accelerator: 'Ctrl+C',
          label: trans('Copy'),
          role: 'copy'
        },
        {
          id: 'menu.copy_html',
          label: trans('Copy as HTML'),
          accelerator: 'Ctrl+Alt+C',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'copy-as-html')
          }
        },
        {
          id: 'menu.paste',
          accelerator: 'Ctrl+V',
          label: trans('Paste'),
          role: 'paste'
        },
        {
          id: 'menu.paste_plain',
          label: trans('Paste without style'),
          accelerator: 'Ctrl+Shift+V',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'paste-as-plain')
          }
        },
        {
          id: 'menu.select_all',
          accelerator: 'Ctrl+A',
          label: trans('Select all'),
          role: 'selectAll'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.find_file',
          label: trans('Find in file'),
          accelerator: 'Ctrl+F',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'search')
          }
        },
        {
          id: 'menu.find_dir',
          label: trans('Find in directory'),
          accelerator: 'Ctrl+Shift+F',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'global-search')
          }
        },
        {
          id: 'menu.filter_files',
          label: trans('Filter files'),
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
          label: trans('Generate new ID'),
          accelerator: 'Ctrl+L',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'insert-id')
          }
        },
        {
          id: 'menu.copy_id',
          label: trans('Copy ID'),
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
      label: trans('View'),
      submenu: [
        {
          id: 'menu.toggle_theme',
          label: trans('Dark mode'),
          accelerator: 'Ctrl+Alt+L',
          type: 'checkbox',
          checked: config.get('darkMode'),
          click: function (menuitem, focusedWindow) {
            config.set('darkMode', config.get('darkMode') === false)
          }
        },
        {
          id: 'menu.toggle_file_meta',
          label: trans('Additional Information'),
          accelerator: 'Ctrl+Alt+S',
          type: 'checkbox',
          checked: config.get('fileMeta'),
          click: function (menuitem, focusedWindow) {
            config.set('fileMeta', config.get('fileMeta') === false)
          }
        },
        {
          id: 'menu.toggle_distraction_free',
          label: trans('Distraction free mode'),
          accelerator: 'Ctrl+J',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'toggle-distraction-free')
          }
        },
        {
          id: 'menu.toggle_typewriter_mode',
          label: trans('Typewriter Mode'),
          accelerator: 'Ctrl+Alt+T',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'toggle-typewriter-mode')
          }
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.toggle_filemanager',
          label: trans('Toggle file manager'),
          accelerator: 'Ctrl+!',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'toggle-file-manager')
          }
        },
        {
          id: 'menu.toggle_sidebar',
          label: trans('Toggle Sidebar'),
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
          label: trans('Reset zoom'),
          accelerator: 'Ctrl+0',
          // NOTE: Since the base font-size can change, resetting the editor
          // font size zoom level is not semantically meaningful
          enabled: useGuiZoom,
          role: (useGuiZoom) ? 'resetZoom' : undefined
        },
        {
          id: 'menu.zoom_in',
          label: trans('Zoom in'),
          accelerator: 'Ctrl+Plus',
          role: (useGuiZoom) ? 'zoomIn' : undefined,
          click: (useGuiZoom) ? undefined : zoomIn(config)
        },
        {
          id: 'menu.zoom_out',
          label: trans('Zoom out'),
          accelerator: 'Ctrl+-',
          role: (useGuiZoom) ? 'zoomOut' : undefined,
          click: (useGuiZoom) ? undefined : zoomOut(config)
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.toggle_fullscreen',
          label: trans('Toggle fullscreen'),
          accelerator: 'F11',
          role: 'togglefullscreen'
        }
      ]
    },
    // debug MENU
    {
      id: 'debug-menu',
      label: trans('Develop'),
      submenu: [
        {
          id: 'menu.reload',
          label: trans('Reload'),
          accelerator: 'F5',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.reload()
          }
        },
        {
          id: 'menu.toggle_devtools',
          label: trans('Toggle developer tools'),
          accelerator: 'Ctrl+Alt+I',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.toggleDevTools()
          }
        },
        {
          id: 'menu.open_logs',
          label: trans('Open Logs'),
          accelerator: 'Ctrl+Alt+Shift+L',
          click: function (menuitem, focusedWindow) {
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
          accelerator: 'Ctrl+M',
          role: 'minimize'
        },
        {
          id: 'menu.win_close',
          label: trans('Close'),
          accelerator: 'Ctrl+Shift+W',
          role: 'close'
        },
        {
          type: 'separator'
        },
        {
          id: 'menu.tab_close',
          label: trans('Close Tab'),
          accelerator: 'Ctrl+W',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'close-window')
          }
        },
        {
          id: 'menu.tab_previous',
          label: trans('Previous Tab'),
          accelerator: 'Ctrl+Shift+Tab',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'previous-tab')
          }
        },
        {
          id: 'menu.tab_next',
          label: trans('Next Tab'),
          accelerator: 'Ctrl+Tab',
          click: function (menuitem, focusedWindow) {
            focusedWindow?.webContents.send('shortcut', 'next-tab')
          }
        },
        {
          id: 'menu.new_window',
          label: 'New window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: function (menuItem, focusedWindow) {
            windows.newMainWindow()
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
          click: function (menuitem, focusedWindow) {
            windows.showAboutWindow()
          }
        },
        {
          id: 'menu.donate',
          label: trans('Support Zettlr'),
          click: function (menuitem, focusedWindow) {
            const target = 'https://patreon.com/zettlr'
            shell.openExternal(target).catch(e => {
              logger.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.learn_more',
          label: trans('Go to website'),
          click: function (menuitem, focusedWindow) {
            const target = 'https://www.zettlr.com/'
            shell.openExternal(target).catch(e => {
              logger.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.latex',
          label: trans('Get LaTeX'),
          click: function (menuitem, focusedWindow) {
            const target = 'https://www.latex-project.org/get/#tex-distributions'
            shell.openExternal(target).catch(e => {
              logger.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.docs',
          label: trans('Open user manual'),
          accelerator: 'F1',
          click: function (menuitem, focusedWindow) {
            const target = 'https://docs.zettlr.com/'
            shell.openExternal(target).catch(e => {
              logger.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
            })
          }
        },
        {
          id: 'menu.open_tutorial',
          label: trans('Open Tutorial'),
          click: function (menuitem, focusedWindow) {
            commands.run('tutorial-open', undefined)
              .catch(e => logger.error(String(e.message), e))
          }
        },
        {
          id: 'menu.update',
          label: trans('Check for updates'),
          click: function (menuitem, focusedWindow) {
            // Immediately open the window instead of first checking
            commands.run('open-update-window', undefined)
              .catch(e => logger.error(String(e.message), e))
          }
        }
      ]
    }
  ]

  // Finally, before returning, make sure to remove the debug menu if applicable
  if (config.get('debug') === false) {
    menu.splice(3, 1)
  }

  return menu
}
