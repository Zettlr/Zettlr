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
import { StateEffect, StateField } from '@codemirror/state'
import { Vim, getCM } from '@replit/codemirror-vim'
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
  on?: (event: string, handler: (data: any) => void) => void
  off?: (event: string, handler: (data: any) => void) => void
}

/**
 * TypeScript interface for Vim API from @replit/codemirror-vim
 */
interface VimAPI {
  getCM?: (view: EditorView) => CM5CompatibleEditor | undefined
  handleKey: (cm: CM5CompatibleEditor, key: string, origin: string) => void
}

/**
 * State effect for showing executed vim commands
 */
export const vimCommandIndicatorEffect = StateEffect.define<string>()

/**
 * State effect for vim mode changes
 */
export const vimModeChangeEffect = StateEffect.define<string>()

/**
 * State field to track the last executed vim command
 */
export const vimCommandIndicatorField = StateField.define<{ command: string; timestamp: number } | null>({
  create: () => null,
  update: (value, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(vimCommandIndicatorEffect)) {
        return {
          command: effect.value,
          timestamp: Date.now()
        }
      }
    }

    // Clear old commands after 3 seconds
    if (value && (Date.now() - value.timestamp) > 3000) {
      return null
    }

    return value
  }
})

/**
 * State field to track the current vim mode
 */
export const vimModeField = StateField.define<string>({
  create: () => 'normal',
  update: (value, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(vimModeChangeEffect)) {
        return effect.value
      }
    }
    return value
  }
})

/**
 * Plugin value that manages custom vim key mappings and prevents character
 * leaking in normal mode by intercepting input events
 */
class VimCustomKeyMappingsPlugin implements PluginValue {
  private currentMode: string = 'normal'
  private processingKey: boolean = false
  private keydownHandler: (event: KeyboardEvent) => void
  private inputHandler: (event: InputEvent) => void
  private beforeInputHandler: (event: InputEvent) => void
  private vimModeChangeHandler: (modeInfo: { mode: string, subMode?: string }) => void

  constructor (private view: EditorView) {
    // Bind event handlers
    this.keydownHandler = this.handleKeydown.bind(this)
    this.inputHandler = this.handleInput.bind(this)
    this.beforeInputHandler = this.handleBeforeInput.bind(this)
    this.vimModeChangeHandler = this.handleVimModeChange.bind(this)

    // Add event listeners in capture phase to intercept before CM6
    this.view.dom.addEventListener('keydown', this.keydownHandler, true)
    this.view.dom.addEventListener('beforeinput', this.beforeInputHandler, true)
    this.view.dom.addEventListener('input', this.inputHandler, true)

    // Setup vim mode detection with retry mechanism
    this.setupVimModeDetectionWithRetry()

    console.log('[Vim Custom Key Mappings] Plugin initialized')
  }

  /**
   * Sets up vim mode detection with retry mechanism since vim may not be initialized yet
   */
  private setupVimModeDetectionWithRetry (): void {
    // Try immediately first
    if (this.setupVimModeDetection()) {
      return // Success
    }

    // If failed, retry every 100ms for up to 2 seconds
    let retries = 0
    const maxRetries = 20
    const retryInterval = 100

    const retryTimer = setInterval(() => {
      retries++
      console.log(`[Vim Custom Key Mappings] Retrying vim mode detection (attempt ${retries}/${maxRetries})`)

      if (this.setupVimModeDetection()) {
        clearInterval(retryTimer)
        return // Success
      }

      if (retries >= maxRetries) {
        console.log('[Vim Custom Key Mappings] Max retries reached, falling back to keydown detection')
        clearInterval(retryTimer)
      }
    }, retryInterval)
  }

  /**
   * Prevents character insertion in normal/visual mode by canceling input events
   * TEMPORARILY DISABLED to fix insert mode
   */
  private handleBeforeInput (event: InputEvent): void {
    // TEMPORARILY DISABLED - just log for now
    console.log('[Vim Custom Key Mappings] BeforeInput event - mode:', this.currentMode, 'inputType:', event.inputType)
  }

  /**
   * Additional safety net to prevent any input that slips through
   * TEMPORARILY DISABLED to fix insert mode
   */
  private handleInput (event: InputEvent): void {
    // TEMPORARILY DISABLED - just log for now
    console.log('[Vim Custom Key Mappings] Input event - mode:', this.currentMode, 'inputType:', event.inputType)
  }

  update (): void {
    // CM6 doesn't have a direct vim-mode-change event, but we can track it
    // The Vim plugin from @replit/codemirror-vim exposes mode via getCM(view).state.vim?.mode
    // For now, we'll detect it in the keydown handler
  }

  destroy (): void {
    // Clean up event listeners
    this.view.dom.removeEventListener('keydown', this.keydownHandler, true)
    this.view.dom.removeEventListener('beforeinput', this.beforeInputHandler, true)
    this.view.dom.removeEventListener('input', this.inputHandler, true)

    // Clean up vim mode detection
    this.cleanupVimModeDetection()
  }

  /**
   * Sets up vim mode detection using the vim-mode-change event
   * @returns true if setup was successful, false otherwise
   */
  private setupVimModeDetection (): boolean {
    try {
      // First check if vim is actually enabled in the config
      const config = this.view.state.field(configField)
      console.log('[Vim Custom Key Mappings] Config check - inputMode:', config?.inputMode, 'vimFixedKeyboardLayout:', config?.vimFixedKeyboardLayout)

      // If vim is not enabled, don't attempt to set up detection
      if (config?.inputMode !== 'vim') {
        console.log('[Vim Custom Key Mappings] Vim not enabled in config, skipping setup')
        return false
      }

      // Use the correct getCM function from the vim plugin
      const cm = getCM(this.view)
      console.log('[Vim Custom Key Mappings] getCM result:', cm)
      console.log('[Vim Custom Key Mappings] cm.state:', cm?.state)
      console.log('[Vim Custom Key Mappings] cm.state.vim:', cm?.state?.vim)
      console.log('[Vim Custom Key Mappings] cm.on type:', typeof cm?.on)

      if (cm && typeof cm.on === 'function') {
        // Listen for vim mode changes
        cm.on('vim-mode-change', this.vimModeChangeHandler)
        console.log('[Vim Custom Key Mappings] Vim mode detection setup successful')
        return true
      } else {
        // Vim not ready yet or not available
        console.log('[Vim Custom Key Mappings] Vim not ready - cm:', !!cm, 'cm.on:', typeof cm?.on)
        return false
      }
    } catch (error) {
      console.error('[Vim Custom Key Mappings] Error setting up vim mode detection:', error)
      return false
    }
  }

  /**
   * Cleans up vim mode detection
   */
  private cleanupVimModeDetection (): void {
    try {
      const cm = getCM(this.view)

      if (cm && typeof cm.off === 'function') {
        cm.off('vim-mode-change', this.vimModeChangeHandler)
        console.log('[Vim Custom Key Mappings] Vim mode detection cleaned up')
      }
    } catch (error) {
      console.error('[Vim Custom Key Mappings] Error cleaning up vim mode detection:', error)
    }
  }

  /**
   * Handles vim mode change events
   */
  private handleVimModeChange (modeInfo: { mode: string, subMode?: string }): void {
    const newMode = modeInfo.mode || 'normal'

    if (this.currentMode !== newMode) {
      console.log('[Vim Custom Key Mappings] Mode changed via event:', this.currentMode, '→', newMode)
      this.currentMode = newMode

      // Dispatch the mode change to the state field
      this.view.dispatch({
        effects: vimModeChangeEffect.of(newMode)
      })
    }
  }

  private handleKeydown (event: KeyboardEvent): void {
    // Prevent re-entry
    if (this.processingKey) {
      return
    }

    // Get the config to check for custom trained mappings
    const config = this.view.state.field(configField)

    // Debug the actual input mode configuration
    if (!this.processingKey) { // Only log once to avoid spam
      console.log('[Vim Custom Key Mappings] Config inputMode:', config?.inputMode)
      console.log('[Vim Custom Key Mappings] Full config:', config)
    }

    // Get the vim mode using the correct API
    const cm = getCM(this.view)
    const vimState = cm?.state?.vim

    if (!vimState) {
      // Vim not initialized yet or not available
      return
    }

    const mode = vimState.mode || 'normal'

    // Debug logging for mode changes
    if (this.currentMode !== mode) {
      console.log('[Vim Custom Key Mappings] Mode changed:', this.currentMode, '→', mode)
      this.currentMode = mode

      // Dispatch the mode change to the state field
      this.view.dispatch({
        effects: vimModeChangeEffect.of(mode)
      })
    }

    // Only process in Normal and Visual modes
    if (mode !== 'normal' && mode !== 'visual') {
      return
    }

    // Don't intercept special keys that vim needs
    const specialKeys = ['Escape', 'Enter', 'Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
    if (specialKeys.includes(event.key)) {
      return
    }

    // For ALL vim commands, show command indicator (basic vim commands and trained mappings)
    let commandToShow: string | null = null

    // Check for trained key mappings first
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
          (Vim as any).handleKey(cm, trainedCommand, 'user')
          commandToShow = trainedCommand
        }
      } catch (error) {
        console.error('[Vim Custom Key Mappings] Error handling vim command:', error)
      } finally {
        // Always clear the guard
        this.processingKey = false
      }
    } else {
      // For regular vim commands (j/k/h/l etc.), show the vim command character
      // Use event.code to get the physical key, not the typed character
      if (event.code) {
        // Map physical key codes to vim command characters
        const codeMatch = event.code.match(/^Key([A-Z])$/)
        if (codeMatch) {
          // Respect shift key for capitalization (e.g., G vs g, E vs e)
          commandToShow = event.shiftKey ? codeMatch[1] : codeMatch[1].toLowerCase()
        }
      } else if (event.key && event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // Fallback to event.key for non-letter keys
        commandToShow = event.key
      }
    }

    // Show command indicator for any vim command
    if (commandToShow) {
      this.view.dispatch({
        effects: vimCommandIndicatorEffect.of(commandToShow)
      })
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
 * Also includes a fix for character leaking in normal mode by intercepting
 * and preventing input events while preserving vim command functionality.
 *
 * Example: On German keyboards, "{" requires Alt+8. Users can train this
 * mapping so that pressing Alt+8 executes the "{" vim command.
 */
export function vimCustomKeyMappings (): Extension {
  return [
    vimCommandIndicatorField,
    vimModeField,
    ViewPlugin.fromClass(VimCustomKeyMappingsPlugin)
  ]
}
