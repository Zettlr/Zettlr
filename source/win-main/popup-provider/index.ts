/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PopupProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The popup provider offers a convenient way to display
 *                  popups across the application. You can call it using
 *                  the helper functions available on the global object.
 *
 * END HEADER
 */

import type { App, defineComponent } from 'vue'
import Popover from './popover'
import './popover.less' // We need some generic base styles

/**
 * The current popover instance, if any
 *
 * @var {Popover|null}
 */
let currentPopover: Popover|null = null

/**
 * Contains the current popup's target. Used to determine whether to toggle
 * or replace the current popup.
 *
 * @var {Element|null}
 */
let currentPopoverTarget: HTMLElement|null = null

function closeFunction (): void {
  if (currentPopover !== null) {
    currentPopover.close()
  }

  currentPopover = null
  currentPopoverTarget = null
}

function showFunction (
  component: typeof defineComponent,
  element: HTMLElement,
  initialData: any,
  shouldToggle: boolean,
  callback: null|((data: any) => void) = null
): Popover|undefined {
  // Do not re-open this popover, if the toggle flag is set, the current target
  // still points to the same element (indicating the same popover being opened)
  // and there is a popover and it is not actually closed.
  const dontReopen = shouldToggle && (currentPopoverTarget === element) && currentPopover?.isClosed() === false
  if (currentPopover !== null && currentPopoverTarget !== null) {
    // Close the previous popover, since only one is allowed
    closeFunction()
  }

  if (dontReopen) {
    return undefined
  }

  // Display the popover and save it to the various variables
  currentPopover = new Popover(component, element, initialData, (data: any) => {
    if (callback !== null) {
      callback(data)
    }
  })

  currentPopoverTarget = element

  // Return the popup instance so that the caller may hook into some
  // functions, e.g. to indicate a change in the popup's contents.
  return currentPopover
}

// <void> indicates the Plugin does not support options
export default {
  install (app: App<Element>, options?: any): void {
    /**
     * Shows the given popup.
     *
     * @param   {Vue}          component        The popover contents (Vue component)
     * @param   {HTMLElement}  element          The element to align the popover to
     * @param   {Function}     [callback=null]  A callback that receives any changes
     *
     * @return  {Popover}                       The popover instance
     */
    app.config.globalProperties.$showPopover = (
      component: typeof defineComponent,
      element: HTMLElement,
      initialData: any,
      callback: null|((data: any) => void) = null
    ): Popover => {
      // Note: Since we are not toggling, there *will* be a Popover returned.
      return showFunction(component, element, initialData, false, callback) as Popover
    }

    /**
     * Toggles the given popup.
     *
     * @param   {Vue}          component        The popover contents (Vue component)
     * @param   {HTMLElement}  element          The element to align the popover to
     * @param   {Function}     [callback=null]  A callback that receives any changes
     *
     * @return  {Popover|undefined}             Returns undefined if the corresponding popover has been closed.
     */
    app.config.globalProperties.$togglePopover = (
      component: typeof defineComponent,
      element: HTMLElement,
      initialData: any,
      callback: null|((data: any) => void) = null
    ): Popover|undefined => {
      // May return undefined
      return showFunction(component, element, initialData, true, callback)
    }

    app.config.globalProperties.$closePopover = closeFunction
  }
}
