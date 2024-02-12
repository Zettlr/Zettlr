import { trans } from '@common/i18n-renderer'
import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'
import { ProgrammaticallyOpenableWindows } from '@providers/commands/open-aux-window'

const ipcRenderer = window.ipc

export function getAppearanceFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Dark mode'),
      group: PreferencesGroups.Appearance,
      titleField: {
        type: 'switch',
        model: 'darkMode'
      },
      help: undefined, // TODO,
      fields: [
        { type: 'separator' },
        {
          type: 'radio',
          label: trans('Schedule'),
          model: 'autoDarkMode',
          inline: true,
          options: {
            off: trans('Off'),
            system: trans('Follow system'),
            schedule: trans('On')
          }
        },
        {
          type: 'style-group',
          style: 'columns',
          fields: [
            {
              type: 'time',
              label: trans('Start'),
              model: 'autoDarkModeStart',
              inline: true,
              disabled: window.config.get('autoDarkMode') !== 'schedule'
            },
            {
              type: 'time',
              label: trans('End'),
              model: 'autoDarkModeEnd',
              inline: true,
              disabled: window.config.get('autoDarkMode') !== 'schedule'
            }
          ]
        }
      ]
    },
    {
      title: trans('Theme'),
      group: PreferencesGroups.Appearance,
      help: undefined, // TODO
      fields: [
        {
          type: 'theme',
          model: 'display.theme',
          label: trans('Here you can choose the theme for the app.'),
          options: {
            berlin: {
              textColor: 'white',
              backgroundColor: '#1cb27e',
              name: 'Berlin',
              fontFamily: 'inherit',
              description: 'An all-time classic: This theme has been part of Zettlr since the very beginning. A modern theme featuring the signatory green color and a sans-serif font.'
            },
            frankfurt: {
              textColor: 'white',
              backgroundColor: '#1d75b3',
              name: 'Frankfurt',
              fontFamily: 'Crimson',
              description: 'In line with the spirit of the time-honoured Frankfurt School, this theme features a mature serif font paired with royal blue.'
            },
            bielefeld: {
              textColor: 'black',
              backgroundColor: '#ffffdc',
              name: 'Bielefeld',
              fontFamily: 'Liberation Mono',
              description: 'With its mellow orange and a monospaced font, this theme gets you as reminiscent of Niklas Luhmann\'s heyday as possible.'
            },
            'karl-marx-stadt': {
              textColor: 'white',
              backgroundColor: '#dc2d2d',
              name: 'Karl-Marx-Stadt',
              fontFamily: 'inherit',
              description: 'City names change, but their spirit remains: A forceful red complements this theme\'s progressive appeal and sans-serif font.'
            },
            bordeaux: {
              textColor: '#dc2d2d',
              backgroundColor: '#fffff8',
              name: 'Bordeaux',
              fontFamily: 'Inconsolata',
              description: 'Design made in France: Enjoy writing with this theme\'s unagitated colors and beautiful monospaced font.'
            }
          }
        }
      ]
    },
    {
      title: trans('Toolbar options'),
      group: PreferencesGroups.Appearance,
      help: undefined, // TODO
      fields: [
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Left section buttons')
        },
        {
          type: 'checkbox',
          label: trans('Display "Open Preferences" button'),
          model: 'displayToolbarButtons.showOpenPreferencesButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "New File" button'),
          model: 'displayToolbarButtons.showNewFileButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Previous File" button'),
          model: 'displayToolbarButtons.showPreviousFileButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Next File" button'),
          model: 'displayToolbarButtons.showNextFileButton'
        },
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Center section buttons')
        },
        {
          type: 'checkbox',
          label: trans('Display readability button'),
          model: 'displayToolbarButtons.showToggleReadabilityButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert Comment" button'),
          model: 'displayToolbarButtons.showMarkdownCommentButton'
        },
        {
          type: 'checkbox',
          label: trans('Display link button'),
          model: 'displayToolbarButtons.showMarkdownLinkButton'
        },
        {
          type: 'checkbox',
          label: trans('Display image button'),
          model: 'displayToolbarButtons.showMarkdownImageButton'
        },
        {
          type: 'checkbox',
          label: trans('Display task list button'),
          model: 'displayToolbarButtons.showMarkdownMakeTaskListButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert Table" button'),
          model: 'displayToolbarButtons.showInsertTableButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert Footnote" button'),
          model: 'displayToolbarButtons.showInsertFootnoteButton'
        },
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Right section buttons')
        },
        {
          type: 'checkbox',
          label: trans('Display document info'),
          model: 'displayToolbarButtons.showDocumentInfoText'
        },
        {
          type: 'checkbox',
          label: trans('Display Pomodoro-timer'),
          model: 'displayToolbarButtons.showPomodoroButton'
        }
      ]
    },
    {
      title: trans('Status bar'),
      group: PreferencesGroups.Appearance,
      help: undefined, // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Show statusbar'),
          model: 'editor.showStatusbar'
        }
      ]
    },
    {
      title: trans('Custom CSS'),
      group: PreferencesGroups.Appearance,
      fields: [
        {
          type: 'button',
          label: trans('Open CSS editor'),
          onClick: () => {
            ipcRenderer.invoke('application', {
              command: 'open-aux-window',
              payload: {
                window: ProgrammaticallyOpenableWindows.AssetsWindow,
                hash: 'tab-custom-css-control'
              }
            })
              .catch(err => console.error(err))
          }
        }
      ]
    }
  ]
}
