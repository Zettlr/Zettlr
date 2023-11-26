import { trans } from '@common/i18n-renderer'
import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'

export function getFileManagerFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Display mode'),
      group: PreferencesGroups.FileManager,
      help: '', // TODO
      fields: [
        {
          type: 'radio',
          label: trans('File manager mode'),
          model: 'fileManagerMode',
          options: {
            thin: trans('Thin &mdash; show either file tree or file list'),
            expanded: trans('Expanded &mdash; show both file tree and file list'),
            combined: trans('Combined &mdash; show files and directories in the file tree')
          }
        },
        { type: 'separator' },
        {
          type: 'checkbox',
          label: trans('Show file information'),
          model: 'fileMeta'
        },
        {
          type: 'checkbox',
          label: trans('Show folders above files'),
          model: 'sortFoldersFirst'
        }
      ]
    },
    {
      title: trans('Markdown document name display'),
      group: PreferencesGroups.FileManager,
      help: '', // TODO
      fields: [
        {
          type: 'radio',
          label: trans('Display files using'),
          model: 'fileNameDisplay',
          options: {
            filename: trans('Filename only'),
            title: trans('Title if applicable'),
            heading: trans('First heading level 1 if applicable'),
            'title+heading': trans('Title or first heading level 1 if applicable')
          }
        },
        {
          // TODO: Checkbox onto the first line of the radio
          type: 'checkbox',
          label: trans('Display Markdown file extensions'),
          model: 'display.markdownFileExtensions',
          disabled: window.config.get('fileNameDisplay') !== 'filename'
        }
      ]
    },
    {
      title: trans('Time display'),
      group: PreferencesGroups.FileManager,
      help: '', // TODO
      fields: [
        {
          type: 'radio',
          label: trans('In the file metadata display'),
          model: 'fileMetaTime',
          options: {
            modtime: trans('Last modification time'),
            creationtime: trans('File creation time')
          }
        }
      ]
    },
    {
      title: trans('Sorting'),
      group: PreferencesGroups.FileManager,
      help: '', // TODO
      fields: [
        {
          type: 'radio',
          label: trans('Sorting order for files (used for sorting by name)'),
          model: 'sorting',
          options: {
            natural: trans('Natural order (10 after 2)'),
            ascii: trans('ASCII order (2 after 10)')
          }
        },
        // TODO: This option can be inferred from the Time display setting (fileMetaTime), so TO BE REMOVED
        {
          type: 'radio',
          label: trans('When sorting by time, sort by'),
          model: 'sortingTime',
          options: {
            modtime: trans('Last modification time'),
            creationtime: trans('File creation time')
          }
        }
      ]
    }
  ]
}
