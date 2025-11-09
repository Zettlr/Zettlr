/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Vim Fixed Keyboard Hook (CodeMirror 6)
 * CVM-Role:        Extension
 * Maintainer:      Orwa Diraneyya
 * License:         GNU GPL v3
 *
 * Description:     Enables fixed keyboard layout for Vim Normal mode using
 *                  physical key positions instead of characters. This intercepts
 *                  keydown events at the DOM level BEFORE CodeMirror processes
 *                  them, remaps physical keys to their Vim command equivalents,
 *                  and then manually triggers Vim's key handling.
 *
 *                  CodeMirror 6 version - uses ViewPlugin and Vim API from
 *                  @replit/codemirror-vim
 *
 * END HEADER
 */

import { type Extension, EditorView, ViewPlugin, type PluginValue } from '@codemirror/view'
import { Vim } from '@replit/codemirror-vim'
import { getVimCommandForPhysicalKey } from '../keyboard-layout-mapper'
import { configField } from '../util/configuration'

/**
 * TypeScript interface for CodeMirror 5 compatible object returned by Vim.getCM()
 */
interface CM5CompatibleEditor {
  state?: {
    vim?: {
      mode?: string
    }
  }
}

/**
 * TypeScript interface for Vim API from @replit/codemirror-vim
 */
interface VimAPI {
  getCM?: (view: EditorView) => CM5CompatibleEditor | undefined
  handleKey: (cm: CM5CompatibleEditor, key: string, origin: string) => void
}

/**
 * Plugin value that manages the vim fixed keyboard feature
 */
class VimFixedKeyboardPlugin implements PluginValue {
  private currentMode: string = 'normal'
  private processingKey: boolean = false
  private keydownHandler: (event: KeyboardEvent) => void

  constructor (private view: EditorView) {
    // Bind the keydown handler
    this.keydownHandler = this.handleKeydown.bind(this)

    // Add event listener in capture phase to intercept before CM6
    this.view.dom.addEventListener('keydown', this.keydownHandler, true)

    console.log('[Vim Fixed Keyboard CM6] Plugin initialized')
  }

  update (): void {
    // CM6 doesn't have a direct vim-mode-change event, but we can track it
    // The Vim plugin from @replit/codemirror-vim exposes mode via getCM(view).state.vim?.mode
    // For now, we'll detect it in the keydown handler
  }

  destroy (): void {
    // Clean up the event listener
    this.view.dom.removeEventListener('keydown', this.keydownHandler, true)
  }

  private handleKeydown (event: KeyboardEvent): void {
    // Prevent re-entry
    if (this.processingKey) {
      return
    }

    // Get the vim mode
    // The @replit/codemirror-vim exposes getCM() which returns a CM5-compatible object
    const vimAPI = Vim as unknown as VimAPI
    const cm = vimAPI.getCM?.(this.view)
    const vimState = cm?.state?.vim

    if (!vimState) {
      // Vim not initialized yet or not available
      return
    }

    const mode = vimState.mode || 'normal'
    this.currentMode = mode

    // Only process in Normal and Visual modes
    if (mode !== 'normal' && mode !== 'visual') {
      return
    }

    // Don't intercept modified keys (Ctrl, Alt, Meta)
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return
    }

    // Don't intercept special keys that vim needs
    const specialKeys = ['Escape', 'Enter', 'Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
    if (specialKeys.includes(event.key)) {
      return
    }

    // Check if this physical key maps to a Vim command
    const vimCommand = getVimCommandForPhysicalKey(event.code, event.shiftKey)

    if (vimCommand !== null) {
      // Prevent the browser and CodeMirror from processing the original key
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      // Set the guard to prevent re-entry
      this.processingKey = true

      try {
        // Use Vim's handleKey API
        // The @replit/codemirror-vim exposes Vim.handleKey
        if (cm) {
          vimAPI.handleKey(cm, vimCommand, 'user')
        }
      } catch (error) {
        console.error('[Vim Fixed Keyboard] Error handling vim command:', error)
      } finally {
        // Always clear the guard
        this.processingKey = false
      }
    }
  }
}

/**
 * Creates the vim fixed keyboard extension
 * This will only be active when the feature is enabled in config
 */
export function vimFixedKeyboard (): Extension {
  return ViewPlugin.fromClass(VimFixedKeyboardPlugin)
}

/**
 * Helper function to check if the feature should be enabled
 * This is called from the editor initialization code
 */
export function shouldEnableVimFixedKeyboard (view: EditorView): boolean {
  try {
    const config = view.state.field(configField)
    const isVimMode = config.editor.inputMode === 'vim'
    const isFeatureEnabled = Boolean(config.editor.vimFixedKeyboardLayout)

    console.log('[Vim Fixed Keyboard CM6] Config check - inputMode:', config.editor.inputMode, 'vimFixedKeyboardLayout:', config.editor.vimFixedKeyboardLayout)
    console.log('[Vim Fixed Keyboard CM6] Should enable:', isVimMode && isFeatureEnabled)

    return isVimMode && isFeatureEnabled
  } catch (error) {
    console.error('[Vim Fixed Keyboard CM6] Error checking config:', error)
    return false
  }
}
