/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        v-focus directive
 * CVM-Role:        Vue Directive
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This directive allows auto-focusing an element as soon as it
 *                  gets inserted into the DOM. This is different to the
 *                  `autofocus` HTML attribute, since it can be executed after
 *                  page load and works on any element.
 *
 * END HEADER
 */

import type { Directive } from 'vue'

// Proper typing, see https://vuejs.org/guide/typescript/composition-api.html#typing-global-custom-directives
export const FocusDirective: Directive<HTMLElement, string> = {
  mounted (el, binding) {
    el.focus()

    // This directive supports modifiers.

    // v-focus.select -> selects an input element's contents.
    if (el instanceof HTMLInputElement && binding.modifiers.select === true) {
      el.select()
      if (binding.modifiers.filename === true) {
        // v-focus.select.filename -> Only selects up to the last dot.
        el.setSelectionRange(0, el.value.lastIndexOf('.'))
      }
    }
  }
}

declare module 'vue' {
  export interface GlobalDirectives {
    vFocus: Directive<HTMLElement, string>
  }
}
