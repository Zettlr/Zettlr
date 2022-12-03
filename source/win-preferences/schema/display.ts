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
          text: trans('These options determine which elements are rendered in documents.')
        },
        {
          type: 'checkbox',
          label: trans('Render Citations'),
          model: 'display.renderCitations'
        },
        {
          type: 'checkbox',
          label: trans('Render Iframes'),
          model: 'display.renderIframes'
        },
        {
          type: 'checkbox',
          label: trans('Render Images'),
          model: 'display.renderImages'
        },
        {
          type: 'checkbox',
          label: trans('Render Links'),
          model: 'display.renderLinks'
        },
        {
          type: 'checkbox',
          label: trans('Render Formulae'),
          model: 'display.renderMath'
        },
        {
          type: 'checkbox',
          label: trans('Render Tasks'),
          model: 'display.renderTasks'
        },
        {
          type: 'checkbox',
          label: trans('Hide heading characters'),
          model: 'display.renderHTags'
        },
        {
          type: 'checkbox',
          label: trans('Render emphasis'),
          model: 'display.renderEmphasis'
        }
      ],
      [
        {
          type: 'theme',
          model: 'display.theme',
          label: trans('Here you can choose the theme for the app.'),
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
          label: trans('Use the operating system\'s accent colour instead of the theme colour'),
          model: 'display.useSystemAccentColor',
          // Disable on anything except macOS and Windows
          disabled: !isWinOrMac,
          info: (!isWinOrMac) ? trans('This setting is only available on Windows and macOS') : undefined
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Hide toolbar in distraction free mode'),
          model: 'display.hideToolbarInDistractionFree'
        }
      ],
      [
        {
          type: 'fieldset-label', // TODO: Create this type
          text: trans('With these controls you can constrain the image previews.')
        },
        {
          type: 'slider',
          label: trans('Maximum width of images (percent)'),
          name: 'slider-image-width',
          min: 0,
          max: 100,
          model: 'display.imageWidth'
        },
        {
          type: 'slider',
          label: trans('Maximum height of images (percent)'),
          name: 'slider-image-height',
          min: 0,
          max: 100,
          model: 'display.imageHeight'
        }
      ]
    ]
  }
}
