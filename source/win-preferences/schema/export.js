import { trans } from '../../common/i18n'

export default {
  fieldsets: [
    [
      {
        type: 'checkbox',
        label: trans('dialog.preferences.export.strip_id_label'),
        model: 'export.stripIDs'
      },
      {
        type: 'checkbox',
        label: trans('dialog.preferences.export.strip_tags_label'),
        model: 'export.stripTags'
      }
    ],
    [
      {
        type: 'radio',
        label: '', // TODO
        model: 'export.stripLinks',
        options: {
          'full': trans('dialog.preferences.export.strip_links_full_label'),
          'unlink': trans('dialog.preferences.export.strip_links_unlink_label'),
          'no': trans('dialog.preferences.export.strip_links_no_label')
        }
      }
    ],
    [
      {
        type: 'radio',
        label: trans('dialog.preferences.export.dest'),
        model: 'export.dir',
        options: {
          'tmp': trans('dialog.preferences.export.dest_temp_label'),
          'cwd': trans('dialog.preferences.export.dest_cwd_label')
        }
      }
    ],
    [
      {
        type: 'checkbox',
        label: trans('dialog.preferences.export.use_bundled_pandoc'),
        model: 'export.useBundledPandoc'
      },
      {
        type: 'file',
        label: trans('dialog.preferences.citation_database'),
        model: 'export.cslLibrary',
        filter: {
          'json, yaml, yml': 'CSL JSON',
          'tex': 'BibTex'
        }
      },
      {
        type: 'file',
        label: trans('dialog.preferences.project.csl_style'),
        model: 'export.cslStyle',
        filter: {
          'csl': 'CSL Style'
        }
      }
    ]
  ]
}
