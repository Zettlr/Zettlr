/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Vim Fixed Keyboard Layout Hook (Simplified)
 * CVM-Role:        CodeMirror 6 extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a simple vim keyboard layout mapper
 *                  for non-Latin keyboards, compatible with upstream vim plugin.
 *
 * END HEADER
 */

import { EditorView, ViewPlugin, type PluginValue } from '@codemirror/view'
import { StateEffect, StateField, type Extension } from '@codemirror/state'
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
 * Key mapping from physical keys to vim commands
 */
const PHYSICAL_KEY_MAPPING: Record<string, string> = {
  KeyJ: 'j',
  KeyK: 'k',
  KeyH: 'h',
  KeyL: 'l',
  KeyI: 'i',
  KeyA: 'a',
  KeyO: 'o',
  KeyU: 'u',
  KeyX: 'x',
  KeyD: 'd',
  KeyY: 'y',
  KeyP: 'p',
  KeyV: 'v',
  KeyW: 'w',
  KeyB: 'b',
  KeyE: 'e',
  KeyR: 'r',
  KeyS: 's',
  KeyG: 'g'
}

/**
 * Simple Vim Fixed Keyboard Plugin
 */
class SimpleVimPlugin implements PluginValue {
  private keydownHandler: (event: KeyboardEvent) => void
  private vimModeChangeHandler: (modeInfo: { mode: string, subMode?: string }) => void
  private currentMode: string = 'normal'

  constructor (private view: EditorView) {
    this.keydownHandler = this.handleKeydown.bind(this)
    this.vimModeChangeHandler = this.handleVimModeChange.bind(this)

    // Setup vim mode detection
    this.setupVimModeDetection()

    console.log('[Vim Custom Key Mappings] Simple plugin initialized')
  }

  private setupVimModeDetection(): void {
    setTimeout(() => {
      try {
        const cm = getCM(this.view)
        if (cm && cm.on) {
          cm.on('vim-mode-change', this.vimModeChangeHandler)
          console.log('[Vim Custom Key Mappings] Mode detection setup successful')
        }
      } catch (error) {
        console.warn('[Vim Custom Key Mappings] Failed to setup mode detection:', error)
      }
    }, 100)
  }

  private handleVimModeChange(modeInfo: { mode: string, subMode?: string }): void {
    this.currentMode = modeInfo.mode || 'normal'
  }

  private handleKeydown(event: KeyboardEvent): void {
    const config = this.view.state.field(configField)

    // Only intercept if vim mode is enabled and feature is enabled
    if (config.inputMode !== 'vim' || !config.vimFixedKeyboardLayout) {
      return
    }

    // Only handle in normal mode to avoid interfering with insert mode
    if (this.currentMode !== 'normal') {
      return
    }

    const physicalKey = event.code
    const vimCommand = PHYSICAL_KEY_MAPPING[physicalKey]

    if (vimCommand) {
      event.preventDefault()
      event.stopPropagation()

      try {
        const cm = getCM(this.view)
        if (cm && Vim.handleKey) {
          Vim.handleKey(cm, vimCommand, 'user')
          console.log(`[Vim Custom Key Mappings] Mapped ${physicalKey} -> ${vimCommand}`)
        }
      } catch (error) {
        console.error('[Vim Custom Key Mappings] Error executing vim command:', error)
      }
    }
  }

  update() {
    const config = this.view.state.field(configField)

    if (config.inputMode === 'vim' && config.vimFixedKeyboardLayout) {
      // Enable event listeners
      if (!this.view.dom.ownerDocument.addEventListener) return
      this.view.dom.ownerDocument.addEventListener('keydown', this.keydownHandler, { capture: true })
    } else {
      // Disable event listeners
      if (!this.view.dom.ownerDocument.removeEventListener) return
      this.view.dom.ownerDocument.removeEventListener('keydown', this.keydownHandler, { capture: true })
    }
  }

  destroy(): void {
    // Clean up event listeners
    if (this.view.dom.ownerDocument.removeEventListener) {
      this.view.dom.ownerDocument.removeEventListener('keydown', this.keydownHandler, { capture: true })
    }

    // Clean up vim mode listener
    try {
      const cm = getCM(this.view)
      if (cm && cm.off) {
        cm.off('vim-mode-change', this.vimModeChangeHandler)
      }
    } catch (error) {
      console.warn('[Vim Custom Key Mappings] Error during cleanup:', error)
    }

    console.log('[Vim Custom Key Mappings] Simple plugin destroyed')
  }
}

/**
 * Creates the simple vim fixed keyboard extension
 */
export function simpleVimFixedKeyboard(): Extension {
  return ViewPlugin.fromClass(SimpleVimPlugin)
}