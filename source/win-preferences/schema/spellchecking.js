import { trans } from '../../common/i18n-renderer'

export default {
  fieldsets: [
    [
      {
        type: 'list',
        label: trans('dialog.preferences.spellcheck'),
        model: 'availableDictionaries',
        deletable: false,
        editable: [0], // Only the "selectable" column may be edited
        searchable: true,
        searchLabel: trans('dialog.preferences.spellcheck_search_placeholder')
      },
      {
        type: 'list',
        label: trans('dialog.preferences.user_dictionary'),
        model: 'userDictionaryContents',
        deletable: true,
        searchable: true,
        searchLabel: 'Search for entries …'
      }
    ]
  ]
}
