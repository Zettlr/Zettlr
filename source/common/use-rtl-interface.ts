/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RTL Interface Composable
 * CVM-Role:        Utility
 * Maintainer:      Orwa Diraneyya
 * License:         GNU GPL v3
 *
 * Description:     Provides a Vue composable function to determine if the UI
 *                  should use RTL (right-to-left) layout based on the app language.
 *                  Used across all windows to enable RTL interface for Arabic.
 *
 * END HEADER
 */

import { computed, type Ref } from 'vue'
import { useConfigStore } from '../pinia'

/**
 * RTL languages that require interface direction inversion
 * Based on language codes used in Zettlr's translation system
 */
const RTL_LANGUAGES = ['ar', 'ar-AR', 'he', 'he-IL', 'ur', 'ur-PK', 'fa', 'fa-IR']

/**
 * Vue composable function that provides RTL interface support
 *
 * @returns Object with reactive properties for RTL interface
 */
export function useRTLInterface() {
  const configStore = useConfigStore()

  /**
   * Computed property that determines if interface should be RTL
   * based on the current app language
   */
  const isRTLInterface = computed(() => {
    const appLang = configStore.config.appLang
    // Check if the current app language is in the RTL languages list
    return RTL_LANGUAGES.includes(appLang)
  })

  /**
   * Computed CSS direction property ('ltr' | 'rtl')
   */
  const cssDirection = computed(() => {
    return isRTLInterface.value ? 'rtl' : 'ltr'
  })

  /**
   * Computed property for HTML dir attribute
   */
  const htmlDir = computed(() => {
    return isRTLInterface.value ? 'rtl' : 'ltr'
  })

  /**
   * Computed property for text alignment
   */
  const textAlign = computed(() => {
    return isRTLInterface.value ? 'right' : 'left'
  })

  /**
   * Computed CSS class for RTL styling
   */
  const cssClass = computed(() => {
    return isRTLInterface.value ? 'rtl-interface' : 'ltr-interface'
  })

  return {
    isRTLInterface,
    cssDirection,
    htmlDir,
    textAlign,
    cssClass
  }
}

/**
 * Helper function to get RTL-aware flex direction
 * Useful for layout components that need to reverse their direction
 */
export function useRTLFlexDirection() {
  const { isRTLInterface } = useRTLInterface()

  const getFlexDirection = (defaultDirection: 'row' | 'column' = 'row') => {
    return computed(() => {
      if (defaultDirection === 'column') {
        return defaultDirection // Column direction doesn't change for RTL
      }
      return isRTLInterface.value ? 'row-reverse' : 'row'
    })
  }

  return {
    getFlexDirection
  }
}

/**
 * Helper function for RTL-aware positioning
 * Converts left/right positioning for RTL layouts
 */
export function useRTLPositioning() {
  const { isRTLInterface } = useRTLInterface()

  const getPosition = (position: 'left' | 'right') => {
    return computed(() => {
      if (!isRTLInterface.value) return position
      // Flip left/right for RTL
      return position === 'left' ? 'right' : 'left'
    })
  }

  return {
    getPosition
  }
}