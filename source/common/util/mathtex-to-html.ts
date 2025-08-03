/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        KaTeX rendering utility
 * CVM-Role:        Utility functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains helper functions to render MathTeX
 *                  equations into HTML strings and into elements. This module
 *                  should only be used in the renderer, as it also depends on
 *                  the KaTeX styles being loaded.
 *
 * END HEADER
 */

import katex from 'katex'
import 'katex/contrib/mhchem'

/**
 * Renders the provided equation to HTML and places it inside the provided
 * element.
 *
 * @param   {string}       equation     The MathTeX equation.
 * @param   {HTMLElement}  element      The target element.
 * @param   {boolean}      displayMode  Whether to use displayMode.
 */
export function katexToElem (equation: string, element: HTMLElement, displayMode: boolean) {
  katex.render(equation, element, { throwOnError: false, displayMode })
}

/**
 * Renders the provided equation to HTML and returns the HTML string.
 *
 * @param   {string}   equation     The MathTeX equation.
 * @param   {boolean}  displayMode  Whether to use displayMode.
 *
 * @return  {string}                The equation as HTML.
 */
export function katexToHTML (equation: string, displayMode: boolean): string {
  return katex.renderToString(equation, { throwOnError: false, displayMode })
}
