/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Helper functions for additional directory classes
 * CVM-Role:        ---
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     With the help of the functions in this file Zettlr can add
 *                  additional directory types and maybe even some day file types etc.
 *
 * END HEADER
 */

const ZettlrInterface = require('../main/zettlr-interface.js');

const PLUGINS = [
    {
        'name': 'Virtual Directories',
        'controller': 'main/zettlr-virtual-directory.js',
        'database': '.ztr-virtual-directories',
        'apply': function(dir, pluginClass, model) {
            // Return an array of all read data
            let data = model.getData();
            let arr = [];
            if(!data) {
                // No data in file
                return arr;
            }

            for(let vd of data) {
                console.log('Applying filter to directory:', vd);
                arr.push(new pluginClass(dir, vd, model))
            }
            return arr;
        },
        'add': function(data) {
            let dir = data.dir,
            name = data.name;
            // Create via Interface and then force a refresh in the dir so that
            // it reads in the new VirtualDirectory.
        }
    }
];

/**
 * Applies all plugins, if their database type is given.
 * @param  {[type]} directory [description]
 * @return {[type]}           [description]
 */
function applyPlugins(directory)
{
    let newChildren = [];
    for(let plugin of PLUGINS) {
        // Create a new interface (one model per database, e.g. per file)
        let dbpath = directory.getPath() + plugin.database;
        // Create an interface and hook up the interface class.
        let iface = new ZettlrInterface(dbpath);

        // Hook up the controller itself
        let pluginClass = require('../' + plugin.controller);
        // Now apply the directory plugin
        let additionalChildren = plugin.apply(directory, pluginClass, iface);

        newChildren = newChildren.concat(additionalChildren);
    }

    return newChildren;
}

function addToDir(pluginName, data)
{
    let p = null;
    for(let plugin of PLUGINS) {
        if(plugin.name == pluginName) {
            let p = plugin;
            break;
        }
    }

    if(p != null) {
        p.add(data);
    }
}

module.exports = {
    applyPlugins
}
