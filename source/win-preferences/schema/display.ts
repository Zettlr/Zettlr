/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Display Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the display tab schema.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'

export default function (): any {
  const isWinOrMac = [ 'darwin', 'win32' ].includes(process.platform)
  return {
    fieldsets: [
      [
        {
          type: 'fieldset-label', // TODO: Create this type
          text: trans('dialog.preferences.display.preview_info')
        },
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
          label: trans('dialog.preferences.display.render_emphasis'),
          model: 'display.renderEmphasis'
        }
      ],
      [
        {
          type: 'theme',
          model: 'display.theme',
          label: trans('dialog.preferences.theme.info'),
          options: {
            'berlin': {
              textColor: 'white',
              backgroundColor: '#1cb27e',
              name: 'Berlin',
              fontFamily: 'inherit',
              description: 'An all-time classic: This theme has been part of Zettlr since the very beginning. A modern theme featuring the signatory green color and a sans-serif font.'
            },
            'frankfurt': {
              textColor: 'white',
              backgroundColor: '#1d75b3',
              name: 'Frankfurt',
              fontFamily: 'Crimson',
              description: 'In line with the spirit of the time-honoured Frankfurt School, this theme features a mature serif font paired with royal blue.'
            },
            'bielefeld': {
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
            'bordeaux': {
              textColor: '#dc2d2d',
              backgroundColor: '#fffff8',
              name: 'Bordeaux',
              fontFamily: 'Inconsolata',
              description: 'Design made in France: Enjoy writing with this theme\'s unagitated colors and beautiful monospaced font.'
            }
          }
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.theme.accent_color_label'),
          model: 'display.useSystemAccentColor',
          // Disable on anything except macOS and Windows
          disabled: !isWinOrMac,
          info: (!isWinOrMac) ? trans('dialog.preferences.theme.accent_color_info') : undefined
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.display.hide_toolbar_distraction_free'),
          model: 'display.hideToolbarInDistractionFree'
        }
      ],
      [
        {
          type: 'fieldset-label', // TODO: Create this type
          text: trans('dialog.preferences.display.image_size_info')
        },
        {
          type: 'slider',
          label: trans('dialog.preferences.display.image_width'),
          name: 'slider-image-width',
          min: 0,
          max: 100,
          model: 'display.imageWidth'
        },
        {
          type: 'slider',
          label: trans('dialog.preferences.display.image_height'),
          name: 'slider-image-height',
          min: 0,
          max: 100,
          model: 'display.imageHeight'
        }
      ]
    ]
  }
}
