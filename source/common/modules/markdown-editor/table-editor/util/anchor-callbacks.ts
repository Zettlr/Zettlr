/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Anchor Callbacks
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a function to intercept link clicks in HTML.
 *
 * END HEADER
 */

/**
 * This function takes in a generic HTML element that contains anchor elements.
 * For all of these, it intercepts clicks and prevents the default behavior.
 * Instead, it calls the provided callback function with the link target which
 * the caller may handle as they please.
 *
 * @param   {HTMLElement}             content  The container element
 * @param   {(href: string) => void}  cb       The callback function
 */
export function interceptAnchorClicks (content: HTMLElement, cb: (href: string) => void) {
  const anchors = content.querySelectorAll('a')

  for (const anchor of anchors) {
    const override = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      // NOTE: `anchor.href` already returns a *resolved* link.
      cb(anchor.getAttribute('href') ?? '')
      return false
    }

    anchor.addEventListener('click', override)
  }
}
