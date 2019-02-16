// This command saves an image from clipboard

const ZettlrCommand = require('./zettlr-command')
const ZettlrPrint = require('../zettlr-print.js')
const { app } = require('electron')
const makeExport = require('../zettlr-export')
const { trans } = require('../../common/lang/i18n')

class Export extends ZettlrCommand {
  constructor (app) {
    super(app, 'export')

    // Load the print window handler class
    this._printWindow = new ZettlrPrint()
  }

  /**
    * Export a file to another format.
    * @param  {Object} arg An object containing hash and wanted extension.
    * @return {Boolean}     Whether or not the call succeeded.
    */
  run (arg) {
    let file = this._app.findFile({ 'hash': parseInt(arg.hash) })
    let opt = {
      'format': arg.ext, // Which format: "html", "docx", "odt", "pdf"
      'file': file, // The file to be exported
      'dest': (global.config.get('export.dir') === 'temp') ? app.getPath('temp') : file.parent.path, // Either temp or cwd
      'stripIDs': global.config.get('export.stripIDs'),
      'stripTags': global.config.get('export.stripTags'),
      'stripLinks': global.config.get('export.stripLinks'),
      'pdf': global.config.get('pdf'),
      'title': file.name.substr(0, file.name.lastIndexOf('.')),
      'author': global.config.get('pdf').author,
      'keywords': global.config.get('pdf').keywords,
      'cslStyle': global.config.get('export.cslStyle')
    }

    // Call the exporter. Don't throw the "big" error as this is single-file export
    makeExport(opt)
      .then((exporter) => { global.ipc.notify(trans('system.export_success', opt.format.toUpperCase())) })
      .catch((err) => {
        console.log(err)
        // Error may be thrown. If there's additional info, spit out an extended
        // dialog.
        if (err.additionalInfo) {
          global.ipc.notify(err.name + ': ' + err.message)
        } else {
          global.ipc.notify(err.name + ': ' + err.message)
        }
      })
  }
}

module.exports = Export
