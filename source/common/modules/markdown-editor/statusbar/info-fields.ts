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

export function getWordCountLimit(state: EditorState, view: EditorView){
  let activePopup: HTMLDivElement | null = null; // Track active popup

  const onClickHandler = (event: MouseEvent) => {
    if (activePopup) {
      // Close any existing popups before opening a new one
      document.body.removeChild(activePopup);
      activePopup = null;
    }

    activePopup = createPopup();
    document.body.appendChild(activePopup);
  };

  function createPopup() {
    const popupContainer = document.createElement('div');
    popupContainer.className = 'popup-container';
    popupContainer.style.position = 'fixed';
    popupContainer.style.top = '50%';
    popupContainer.style.left = '50%';
    popupContainer.style.transform = 'translate(-50%, -50%)';
    popupContainer.style.backgroundColor = '#fff';
    popupContainer.style.padding = '20px';
    popupContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
    popupContainer.style.border = '2px solid black'; // Highlight with black border
    popupContainer.style.borderRadius = '10px'; // Rounded corners
    popupContainer.style.zIndex = '1000';
    popupContainer.style.width = '300px'; // Set width
    popupContainer.style.height = '150px'; // Set height
    popupContainer.style.cursor = 'move'; // Cursor style for drag

    // Draggable functionality
    let isDragging = false;
    let initialX: number;
    let initialY: number;

    popupContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      initialX = e.clientX - popupContainer.getBoundingClientRect().left;
      initialY = e.clientY - popupContainer.getBoundingClientRect().top;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const newX = e.clientX - initialX;
        const newY = e.clientY - initialY;
        popupContainer.style.left = `${newX}px`;
        popupContainer.style.top = `${newY}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Style for the popup input field
    const inputElement = document.createElement('input');
    inputElement.type = 'number';
    inputElement.value = '1'; // Set default value to 1
    inputElement.min = '1'; // Minimum value allowed is 1
    inputElement.style.width = 'calc(100% - 20px)';
    inputElement.style.padding = '8px';
    inputElement.style.marginBottom = '10px';
    inputElement.style.border = '1px solid black'; // Highlight with black border
    popupContainer.appendChild(inputElement);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.bottom = '10px';
    buttonContainer.style.right = '10px';
    buttonContainer.style.width = 'calc(100% - 20px)';

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Set Target';
    submitButton.style.padding = '8px';
    submitButton.style.marginLeft = '10px';
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
    cancelButton.style.padding = '8px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.addEventListener('click', () => {
      closePopup();
    });

    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(cancelButton);
    popupContainer.appendChild(buttonContainer);

    // Function to close the popup and clean up
    function closePopup() {
      document.body.removeChild(popupContainer);
      activePopup = null;
    }

    return popupContainer;
  }

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
export function wordcountStatus(state: EditorState, view: EditorView): StatusbarItem | null {
  const counter = state.field(countField, false);
  
  if (counter === undefined) {
    return null;
  } else {
    const wordCount = counter.words;
    let content = trans('sesson word count: %s', localiseNumber(wordCount));
    if (sessionWordCountTarget !== null) {
      let percentage = ((wordCount / sessionWordCountTarget) * 100).toFixed(2);
      if (wordCount > sessionWordCountTarget){
        content = trans('sesson word count: %s', localiseNumber(sessionWordCountTarget));
        percentage = ((sessionWordCountTarget / sessionWordCountTarget) * 100).toFixed(2);
      } 
      content += trans('/%s', localiseNumber(sessionWordCountTarget));
      content += ` (${percentage}%)`;
    }
    content += ` words`

    return {
      content: content
    };
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
