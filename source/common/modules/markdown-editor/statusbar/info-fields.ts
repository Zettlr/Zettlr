/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Info Statusbar Items
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
*
 * Description:     This file defines a set of info statusbar items
 *
 * END HEADER
 */

import { type EditorState } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import localiseNumber from '@common/util/localise-number'
import { type StatusbarItem } from '.'
import { countField } from '../plugins/statistics-fields'
import { configField } from '../util/configuration'

/**
 * Displays the cursor position
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element
 */
export function cursorStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const mainOffset = state.selection.main.head
  const line = state.doc.lineAt(mainOffset)
  return {
    content: `${line.number}:${mainOffset - line.from + 1}`
  }
}

/**
 * Displays the word count, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */

// Variable to store the word count limit

let sessionWordCountTarget: number | null = null;
let activePopup: HTMLDivElement | null = null; // Track active popup

export function getWordCountLimit(state: EditorState, view: EditorView){
  const onClickHandler = (event: MouseEvent) => {
    if (activePopup) {
      // Close any existing popups before opening a new one
      document.body.removeChild(activePopup);
      activePopup = null;
    }

    const popupContainer = document.createElement('div');
    popupContainer.className = 'popup-container';
    popupContainer.style.position = 'fixed';
    popupContainer.style.top = '50%';
    popupContainer.style.left = '50%';
    popupContainer.style.transform = 'translate(-50%, -50%)';
    popupContainer.style.backgroundColor = '#fff';
    popupContainer.style.padding = '20px';
    popupContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
    popupContainer.style.zIndex = '1000';

    // Style for the popup input field
    const inputElement = document.createElement('input');
    inputElement.type = 'number';
    inputElement.placeholder = 'Enter word count target';
    inputElement.style.width = '100%';
    inputElement.style.padding = '8px';
    inputElement.style.border = '1px solid black';

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Set Target';
    submitButton.style.marginTop = '10px';
    submitButton.style.padding = '8px';
    submitButton.style.cursor = 'pointer';
    submitButton.addEventListener('click', () => {
      const inputValue = inputElement.value.trim();
      const parsedInput = parseInt(inputValue, 10);
      if (!isNaN(parsedInput) && parsedInput >= 0) {
        sessionWordCountTarget = parsedInput;
        alert(`Session word count target set to: ${sessionWordCountTarget}`);
        closePopup();
      } else {
        alert("Invalid input. Please enter a valid non-negative number.");
      }
    });

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.marginTop = '10px';
    cancelButton.style.padding = '8px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.addEventListener('click', () => {
      closePopup();
    });

    popupContainer.appendChild(inputElement);
    popupContainer.appendChild(document.createElement('br'));
    popupContainer.appendChild(submitButton);
    popupContainer.appendChild(cancelButton);

    document.body.appendChild(popupContainer);
    activePopup = popupContainer;

    // Function to close the popup and clean up
    function closePopup() {
      if (activePopup === popupContainer) {
        document.body.removeChild(popupContainer);
        activePopup = null;
      }
    }
  };

  const statusBarItem: StatusbarItem = {
    content: 'Set Session Word Count Target',
    onClick: onClickHandler,
    allowHtml: false // Adjust based on your needs
  };

  return statusBarItem;
}
// export function wordcountStatus(state: EditorState, view: EditorView) {
//   const counter = state.field(countField, false);
//   if (counter === undefined) {
//     return null;
//   } else {
//     let displayWordCount = counter.words;

//     if (wordCountLimit !== null && counter.words >= wordCountLimit) {
//       displayWordCount = wordCountLimit;
//     }

//     return {
//       content: trans('%s words', localiseNumber(displayWordCount)),
//       allowHtml: true,
//       onClick() {
//         wordCountLimit = getWordCountLimit();
//         if (wordCountLimit !== null) {
//           alert(`Word count limit set to ${wordCountLimit} words.`);
//         } else {
//           alert('Word count limit removed.');
//         }
//       }
//     };
//   }
// }
export function wordcountStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const counter = state.field(countField, false)
  if (counter === undefined) {
    return null
  } else {
    return {
      content: trans('%s words', localiseNumber(counter.words))
    }
  }
}

/**
 * Displays the character count, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
export function charcountStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const counter = state.field(countField, false)
  if (counter === undefined) {
    return null
  } else {
    return {
      content: trans('%s characters', localiseNumber(counter.chars))
    }
  }
}

/**
 * Displays an input mode indication, if applicable
 *
 * @param   {EditorState}    state  The EditorState
 * @param   {EditorView}     view   The EditorView
 *
 * @return  {StatusbarItem}         Returns the element or null
 */
export function inputModeStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const config = state.field(configField, false)
  if (config === undefined) {
    return null
  } else if (config.inputMode !== 'default') {
    return {
      content: 'Mode: ' + (config.inputMode === 'vim' ? 'Vim' : 'Emacs')
    }
  } else {
    return null
  }
}
