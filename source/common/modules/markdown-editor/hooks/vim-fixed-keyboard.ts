/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Vim Custom Key Mappings Hook (CodeMirror 6)
 * CVM-Role:        Extension
 * Maintainer:      Orwa Diraneyya
 * License:         GNU GPL v3
 *
 * Description:     Provides custom key mappings for Vim commands that require
 *                  modifier keys on non-QWERTY keyboards. For example, on German
 *                  keyboards, "{" requires Alt+8, which this plugin maps to the
 *                  "{" vim command.
 *
 *                  NOTE: Basic vim commands (h/j/k/l/w/b/etc.) work automatically
 *                  with non-Latin keyboards thanks to @replit/codemirror-vim's
 *                  built-in physical key mapping. This plugin ONLY handles
 *                  characters that require modifier keys (Alt/Ctrl/Meta).
 *
 *                  CodeMirror 6 version - uses ViewPlugin and Vim API from
 *                  @replit/codemirror-vim (fork: github:diraneyya/codemirror-vim)
 *
 * END HEADER
 */

import { type Extension, EditorView, ViewPlugin, type PluginValue } from '@codemirror/view'
import { Vim } from '@replit/codemirror-vim'
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
 * Plugin value that manages custom vim key mappings
 */
class VimCustomKeyMappingsPlugin implements PluginValue {
  private currentMode: string = 'normal'
  private processingKey: boolean = false
  private keydownHandler: (event: KeyboardEvent) => void

  constructor (private view: EditorView) {
    // Bind the keydown handler
    this.keydownHandler = this.handleKeydown.bind(this)

    // Add event listener in capture phase to intercept before CM6
    this.view.dom.addEventListener('keydown', this.keydownHandler, true)

    console.log('[Vim Custom Key Mappings] Plugin initialized')
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

    // Get the config to check for custom trained mappings
    const config = this.view.state.field(configField)

    // Get the vim mode
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

    // Don't intercept special keys that vim needs
    const specialKeys = ['Escape', 'Enter', 'Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
    if (specialKeys.includes(event.key)) {
      return
    }

    // Check for trained key mappings
    // These are user-configured key combinations that map to vim commands
    // Example: Alt+8 → "{" on German keyboards
    const trainedCommand = this.findTrainedMapping(event)

    if (trainedCommand !== null) {
      // Found a trained mapping - execute it
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      // Set the guard to prevent re-entry
      this.processingKey = true

      try {
        // Use Vim's handleKey API to execute the command
        if (cm) {
          vimAPI.handleKey(cm, trainedCommand, 'user')
        }
      } catch (error) {
        console.error('[Vim Custom Key Mappings] Error handling vim command:', error)
      } finally {
        // Always clear the guard
        this.processingKey = false
      }
    }

    // NOTE: We do NOT handle basic vim commands (h/j/k/l/w/b/etc.) here.
    // Those are automatically handled by @replit/codemirror-vim's built-in
    // physical key mapping for non-ASCII characters. See vimKeyFromEvent()
    // in the vim plugin source for details.
  }

  /**
   * Finds a trained key mapping that matches the current keyboard event
   * @param event The keyboard event
   * @returns The Vim command character if found, null otherwise
   */
  private findTrainedMapping (event: KeyboardEvent): string | null {
    try {
      const config = this.view.state.field(configField)
      const mappings = config.vimKeyMappings

      // Search through all trained mappings
      for (const vimChar in mappings) {
        const mapping = mappings[vimChar]

        // Skip unmapped entries (empty code)
        if (!mapping.code) {
          continue
        }

        // Check if this mapping matches the current event
        // We match on: physical key code + all modifier states
        if (
          mapping.code === event.code &&
          mapping.shiftKey === event.shiftKey &&
          mapping.altKey === event.altKey &&
          mapping.ctrlKey === event.ctrlKey &&
          mapping.metaKey === event.metaKey
        ) {
          // Found a match - return the vim command character
          return mapping.vimChar
        }
      }

      return null
    } catch (error) {
      console.error('[Vim Custom Key Mappings] Error finding trained mapping:', error)
      return null
    }
  }
}

/**
 * Creates the vim custom key mappings extension
 * This provides support for training custom key combinations for vim commands
 * that require modifier keys (Alt/Ctrl/Meta) on non-QWERTY keyboards.
 *
 * Example: On German keyboards, "{" requires Alt+8. Users can train this
 * mapping so that pressing Alt+8 executes the "{" vim command.
 */
export function vimCustomKeyMappings (): Extension {
  return ViewPlugin.fromClass(VimCustomKeyMappingsPlugin)
}
