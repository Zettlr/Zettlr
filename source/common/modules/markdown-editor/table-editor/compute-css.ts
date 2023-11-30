/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableHelper utility function
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Returns the computed CSS styles for table helper elements.
 *
 * END HEADER
 */

/**
 * Returns a style element containing the computed styles for the TableEditor.
 *
 * @param   {Number}  edgeButtonSize  The size of the edge buttons
 *
 * @return  {Element}                 The rendered element.
 */
export default function computeCSS (edgeButtonSize: number): Element {
  let styleNode = document.createElement('style')
  styleNode.setAttribute('id', 'tableHelperCSS')
  styleNode.setAttribute('type', 'text/css')

  styleNode.textContent = `
  table.table-helper {
    width: 100%;
    display: inline-table; /* Prevent any issues with CodeMirror */
    border: 1px solid #666;
    padding: 0px;
    border-collapse: collapse;
  }

  table.table-helper tr:first-child {
    font-weight: bold;
  }

  table.table-helper td {
    padding: 2px;
    border: 1px solid #666;
    border-collapse: collapse;
    min-width: 10px;
    /* Codemirror 6's drawCursor plugin makes the actual cursor transparent, so
    we have to reset it here for the contenteditables. Similar with selections */
    caret-color: rgb(0, 0, 0);
  }

  /* We must pull to the front these buttons, lest they be overlaid by some
     elements of CodeMirror */
  .table-helper-align-button-container,
  .table-helper-remove-button-container,
  .table-helper-save-status-button {
    z-index: 2;
  }

  .table-helper-add-button {
    z-index: 3;
  }

  .table-helper-align-button-container {
    opacity: 0.25;
    transition: 0.2s opacity ease;
    width: ${edgeButtonSize * 3}px;
    height: ${edgeButtonSize}px;
    border-radius: ${edgeButtonSize * 0.25}px;
    overflow: hidden;
    background-color: #fff;
    color: #4d5d75;
    position: absolute;
    box-shadow: 2px 2px 5px 0px rgba(0, 0, 0, .25);
  }

  .table-helper-align-button-container:hover { opacity: 1; }

  .table-helper-align-button, .table-helper-remove-button {
    width: ${edgeButtonSize}px;
    height: ${edgeButtonSize}px;
    padding-top: ${edgeButtonSize * 0.1}px;
    display: inline-block;
    vertical-align: top;
    text-align: center;
    cursor: pointer;
    transition: 0.2s background-color ease;
  }

  .table-helper-align-button:hover, .table-helper-remove-button:hover {
    background-color: #cde;
  }

  .table-helper-align-button-line {
    width: ${edgeButtonSize * 0.74}px;
    height: ${edgeButtonSize * 0.1}px;
    margin-top: ${edgeButtonSize * 0.13}px;
    margin-left: ${edgeButtonSize * 0.13}px;
    margin-right: ${edgeButtonSize * 0.13}px;
    background-color: #4d5d75;
  }

  .table-helper-align-button.align-left div:last-child {
    width: ${edgeButtonSize * 0.4}px;
  }

  .table-helper-align-button.align-right div:last-child {
    width: ${edgeButtonSize * 0.4}px;
    margin-left: ${edgeButtonSize * 0.47}px;
  }

  .table-helper-align-button.align-center div:nth-child(2) {
    width: ${edgeButtonSize * 0.4}px;
    margin-left: ${edgeButtonSize * 0.27}px;
  }

  .table-helper-remove-button-container {
    opacity: 0.25;
    transition: 0.2s opacity ease;
    width: ${edgeButtonSize * 2}px;
    height: ${edgeButtonSize}px;
    border-radius: ${edgeButtonSize * 0.25}px;
    overflow: hidden;
    background-color: #fff;
    color: #4d5d75;
    position: absolute;
    box-shadow: 2px 2px 5px 0px rgba(0, 0, 0, .25);
  }

  .table-helper-remove-button-container:hover { opacity: 1; }

  .table-helper-remove-button-line {
    background-color: #4d5d75;
    width: ${edgeButtonSize * 0.74}px;
    height: ${edgeButtonSize * 0.1}px;
  }

  .table-helper-remove-button.row .table-helper-remove-button-line {
    position: absolute;
    top: ${edgeButtonSize / 2}px;
    left: ${edgeButtonSize * 0.13}px; /* The margin */
  }

  .table-helper-remove-button.col .table-helper-remove-button-line {
    position: absolute;
    top: ${edgeButtonSize / 2}px;
    left: ${edgeButtonSize + edgeButtonSize * 0.13}px; /* The margin */
  }

  .table-helper-remove-button-line:nth-child(1) {
    transform: rotate(-45deg);
    background-color: #f56868;
  }
  .table-helper-remove-button-line:nth-child(2) {
    transform: rotate(45deg);
    background-color: #f56868;
  }

  /* row */
  .table-helper-remove-button.row .table-helper-remove-button-line:nth-child(3) {
    transform: rotate(0deg);
  }

  /* col */
  .table-helper-remove-button.col .table-helper-remove-button-line:nth-child(3) {
    transform: rotate(90deg);
  }

  .table-helper-add-button,
  .table-helper-save-status-button {
    opacity: 0.25;
    transition: 0.2s opacity ease;
    width: ${edgeButtonSize}px;
    height: ${edgeButtonSize}px;
    border-radius: ${edgeButtonSize}px;
    background-color: #fff;
    color: #4d5d75;
    text-align: center;
    box-shadow: 2px 2px 5px 0px rgba(0, 0, 0, .25);
    line-height: ${edgeButtonSize}px;
    cursor: pointer;
    position: absolute;
    font-weight: bold;
  }

  .table-helper-save-status-button {
    border-radius: ${edgeButtonSize * 0.25}px;
    background-color: rgb(255, 176, 176);
  }

  .table-helper-save-status-button.is-clean {
    background-color: rgb(180, 240, 170);
  }

  .table-helper-save-status-button svg {
    height: 50%;
  }

  .table-helper-add-button:hover,
  .table-helper-save-status-button:hover {
    opacity: 1;
  }
`

  return styleNode
}
