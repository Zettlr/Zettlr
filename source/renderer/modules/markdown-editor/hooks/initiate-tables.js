
/**
 * Calls the initiate tables command to hook the table editor's
 * event listeners to the table elements.
 *
 * @param   {CodeMirror}  cm  The CodeMirror instance
 */
module.exports = (cm) => {
  cm.on('update', (e) => {
    if (!cm.getOption('zettlr').render.tables) return
    cm.execCommand('markdownInitiateTables')
  })
}
