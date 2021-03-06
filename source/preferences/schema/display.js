import { trans } from '../../common/i18n'

export default {
  fieldsets: [
    [
      {
        type: 'checkbox',
        label: trans('dialog.preferences.display.render_citations'),
        model: 'display.renderCitations'
      },
      {
        type: 'checkbox',
        label: trans('dialog.preferences.display.render_iframes'),
        model: 'display.renderIframes'
      },
      {
        type: 'checkbox',
        label: trans('dialog.preferences.display.render_images'),
        model: 'display.renderImages'
      },
      {
        type: 'checkbox',
        label: trans('dialog.preferences.display.render_links'),
        model: 'display.renderLinks'
      },
      {
        type: 'checkbox',
        label: trans('dialog.preferences.display.render_math'),
        model: 'display.renderMath'
      },
      {
        type: 'checkbox',
        label: trans('dialog.preferences.display.render_tasks'),
        model: 'display.renderTasks'
      },
      {
        type: 'checkbox',
        label: trans('dialog.preferences.display.render_htags'),
        model: 'display.renderHTags'
      },
      {
        type: 'checkbox',
        label: trans('dialog.preferences.display.use_first_headings'),
        model: 'display.useFirstHeadings'
      }
    ],
    [
      {
        type: 'select',
        model: 'display.theme',
        label: trans('dialog.preferences.theme.title'),
        options: {
          'berlin': 'Berlin',
          'frankfurt': 'Frankfurt',
          'bielefeld': 'Bielefeld',
          'karl-marx-stadt': 'Karl-Marx-Stadt',
          'bordeaux': 'Bordeaux'
        },
        placeholder_for_reference: {
          'berlin': {
            textColor: 'white',
            backgroundColor: '#1cb27e',
            name: 'Berlin',
            fontFamily: 'sans-serif'
          },
          'frankfurt': {
            textColor: 'white',
            backgroundColor: '#1d75b3',
            name: 'Frankfurt',
            fontFamily: 'serif'
          },
          'bielefeld': {
            textColor: 'black',
            backgroundColor: '#ffffdc',
            name: 'Bielefeld',
            fontFamily: 'monospace'
          },
          'karl-marx-stadt': {
            textColor: 'white',
            backgroundColor: '#dc2d2d',
            name: 'Karl-Marx-Stadt',
            fontFamily: 'sans-serif'
          },
          'bordeaux': {
            textColor: '#dc2d2d',
            backgroundColor: '#fffff8',
            name: 'Bordeaux',
            fontFamily: 'monospace'
          }
        }
      }
    ]
  ],
  fields: [
    // TODO: Image size constrainer input!
  ]
}
