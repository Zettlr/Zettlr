/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateProjectProperties command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command updates one or more project properties.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class UpdateProjectProperties extends ZettlrCommand {
  constructor (app) {
    super(app, 'update-project-properties')
  }

  /**
    * Display the project settings
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  run (evt, arg) {
    // First, we need to create the new settings object
    let newProperties = {}
    for (let prop of Object.keys(arg.properties)) {
      if (prop.indexOf('.') > 0) {
        // Resolve the nested
        let nested = prop.split('.')
        // Last property must be set manually
        let lastProp = nested.pop()

        // Now make sure the newProperties-object has all properties.
        // We'll also advance a property pointer, which we can easily
        // use to actually set the property then.
        let propertyPointer = newProperties
        for (let nestedProp of nested) {
          if (!propertyPointer.hasOwnProperty(nestedProp)) propertyPointer[nestedProp] = {}
          propertyPointer = propertyPointer[nestedProp]
        }

        // Set the nested property
        propertyPointer[lastProp] = arg.properties[prop]
      } else {
        // Simply apply the prop
        newProperties[prop] = arg.properties[prop]
      }
    }

    // Now find the directory, and apply the new properties to it
    let dir = this._app.findDir(arg.hash)
    if (dir) {
      this._app.getFileSystem().runAction('update-project', {
        'source': dir,
        'info': newProperties
      })
    } else {
      global.log.warning(`Could not update project properties for ${arg.hash}: No directory found!`)
    }
  }
}

module.exports = UpdateProjectProperties
