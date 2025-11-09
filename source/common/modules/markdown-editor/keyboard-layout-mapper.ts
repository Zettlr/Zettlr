/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Keyboard Layout Mapper
 * CVM-Role:        Utility
 * Maintainer:      Orwa Diraneyya
 * License:         GNU GPL v3
 *
 * Description:     Maps non-Latin keyboard characters to their English/Latin
 *                  equivalents for Vim Normal mode commands. This allows users
 *                  who write in RTL or non-Latin languages to use Vim commands
 *                  without switching their OS keyboard layout.
 *
 * END HEADER
 */

/**
 * Physical key code → Vim command mapping (lowercase/unshifted)
 * Uses event.code (physical key position) instead of event.key (character)
 * This works with ALL keyboard layouts (Arabic, Hebrew, Russian, Chinese, etc.)
 */
export const PHYSICAL_KEY_TO_VIM_COMMAND: Record<string, string> = {
  // Essential navigation
  'KeyH': 'h',  // left
  'KeyJ': 'j',  // down
  'KeyK': 'k',  // up
  'KeyL': 'l',  // right

  // Word/text object movement
  'KeyW': 'w',  // word forward
  'KeyB': 'b',  // word backward
  'KeyE': 'e',  // end of word
  'KeyG': 'g',  // go to (gg = top, G = bottom)

  // Basic editing
  'KeyI': 'i',  // insert before cursor
  'KeyA': 'a',  // append after cursor
  'KeyO': 'o',  // open line below
  'KeyX': 'x',  // delete character
  'KeyU': 'u',  // undo
  'KeyS': 's',  // substitute character

  // Advanced editing
  'KeyD': 'd',  // delete operator
  'KeyC': 'c',  // change operator
  'KeyY': 'y',  // yank operator
  'KeyP': 'p',  // put/paste
  'KeyR': 'r',  // replace character

  // Search and navigation
  'KeyF': 'f',  // find character forward
  'KeyT': 't',  // till character forward
  'KeyN': 'n',  // next search result
  'Slash': '/',  // search forward

  // Visual mode
  'KeyV': 'v',  // visual mode

  // Marks and macros
  'KeyM': 'm',  // set mark
  'KeyQ': 'q',  // record macro

  // Other common commands
  'Period': '.',     // repeat last change
  'Comma': ',',      // reverse character find
  'Semicolon': ';',  // repeat character find
  'KeyZ': 'z',       // various commands (zz, zt, zb)

  // Numbers for counts (unshifted)
  'Digit0': '0',  // beginning of line / count
  'Digit1': '1',  // count
  'Digit2': '2',  // count
  'Digit3': '3',  // count
  'Digit4': '4',  // count
  'Digit5': '5',  // count
  'Digit6': '6',  // count
  'Digit7': '7',  // count
  'Digit8': '8',  // count
  'Digit9': '9'   // count
}

/**
 * Shifted key mappings (when Shift is held)
 * Only includes keys where Shift produces a different Vim command
 */
export const SHIFT_COMMAND_MAP: Record<string, string> = {
  'KeyI': 'I',       // insert at beginning of line
  'KeyA': 'A',       // append at end of line
  'KeyO': 'O',       // open line above
  'KeyX': 'X',       // delete character before cursor
  'KeyU': 'U',       // undo line
  'KeyS': 'S',       // substitute line
  'KeyD': 'D',       // delete to end of line
  'KeyC': 'C',       // change to end of line
  'KeyY': 'Y',       // yank line
  'KeyP': 'P',       // put before cursor
  'KeyR': 'R',       // replace mode
  'KeyG': 'G',       // go to end of file
  'KeyF': 'F',       // find character backward
  'KeyT': 'T',       // till character backward
  'KeyN': 'N',       // previous search result
  'KeyV': 'V',       // visual line mode
  'KeyH': 'H',       // move to top of screen
  'KeyL': 'L',       // move to bottom of screen
  'KeyM': 'M',       // move to middle of screen
  'KeyW': 'W',       // WORD forward
  'KeyB': 'B',       // WORD backward
  'KeyE': 'E',       // end of WORD
  'KeyJ': 'J',       // join lines
  'KeyK': 'K',       // keyword lookup
  'Digit4': '$',     // end of line
  'Digit6': '^',     // first non-blank
  'Digit8': '*',     // search word under cursor
  'Digit3': '#',     // search word backwards
  'Digit2': '@',     // play macro
  'Digit5': '%'      // jump to matching bracket
}

/**
 * Maps a physical key code to its Vim command equivalent
 * @param code The physical key code from KeyboardEvent.code (e.g., 'KeyJ')
 * @param shiftKey Whether the Shift key is pressed
 * @returns The Vim command character, or null if not mapped
 */
export function getVimCommandForPhysicalKey (code: string, shiftKey: boolean = false): string | null {
  // If Shift is pressed and we have a shifted mapping, use that
  if (shiftKey && SHIFT_COMMAND_MAP[code] !== undefined) {
    return SHIFT_COMMAND_MAP[code]
  }

  // Otherwise use the normal mapping
  return PHYSICAL_KEY_TO_VIM_COMMAND[code] ?? null
}
