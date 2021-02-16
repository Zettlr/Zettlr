import { trans } from '../../common/i18n'

export default {
  fieldsets: [
    [
      {
        type: 'list',
        label: trans('dialog.preferences.spellcheck'),
        model: 'selectedDicts',
        listOptions: {
          selectable: true,
          multiSelect: true,
          deletable: false,
          searchable: true,
          searchLabel: trans('dialog.preferences.spellcheck_search_placeholder')
        },
        options: {
          'en-GB': 'English (United Kingdom)'
        }
      },
      {
        type: 'list',
        label: trans('dialog.preferences.user_dictionary'),
        model: 'userDictionaryContents',
        listOptions: {
          deletable: true,
          searchable: true,
          searchLabel: 'Search for entries …'
        }
      }
    ]
  ]
}
