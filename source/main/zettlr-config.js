// THIS CLASS HANDLES THE APP CONFIGURATION

const fs = require('fs');
const path = require('path');
const {app} = require('electron');

function ZettlrConfig(parent)
{
    this.parent = parent;
    this.configPath = null;
    this.configFile = null;
    this.config = null;
    // Config Template providing all necessary arguments
    this.cfgtpl = {
        "projectDir": app.getPath('documents'),
        "darkTheme":false,
        "snippets":true,
        "pandoc": 'pandoc',
        "pdflatex": 'pdflatex'
    };

    this.init = function() {
        this.configPath = app.getPath('userData');
        this.configFile = path.join(this.configPath, 'config.json');
        this.load();
    };

    // This function only (re-)reads the configuration file if present
    this.load = function() {
        this.config = this.cfgtpl;
        let readConfig = {};

        // Check if dir exists. If not, create.
        try {
            stats = fs.lstatSync(this.configPath);
        } catch(e) {
            fs.mkdirSync(this.configPath);
        }

        // Does the file already exist?
        try {
            stats = fs.lstatSync(this.configFile);
            readConfig = JSON.parse(fs.readFileSync(this.configFile, { encoding: 'utf8' }));
        } catch(error) {
            fs.writeFileSync(this.configFile, JSON.stringify(this.cfgtpl), { encoding: 'utf8' });
            this.config = this.cfgtpl;
            return; // No need to iterate over objects anymore
        }

        // Overwrite all given attributes (and leave the not given in place)
        // This will ensure sane defaults.
        for (var prop in this.config) {
            if (readConfig.hasOwnProperty(prop)) {
                if(readConfig[prop] != null) {
                    this.config[prop] = readConfig[prop];
                }
            }
        }

        // Check whether the project dir still exists, if not default to documents
        try {
            let stat = fs.lstatSync(this.config.projectDir);
        } catch(e) {
            // Doesn't exist, so revert to default
            this.config.projectDir = app.getPath('documents');
        }
    };

    // Write the config (e.g. on app exit)
    this.save = function() {
        if(this.configFile == null || this.config == null) {
            this.load();
        }
        // (Over-)write the configuration
        fs.writeFileSync(this.configFile, JSON.stringify(this.config), { encoding: 'utf8' });
    };

    // Get an option
    this.get = function(attr) {
        if(this.config.hasOwnProperty(attr)){
            return this.config[attr];
        } else {
            return null;
        }
    };

    // Set an option
    this.set = function(option, value) {
        this.config[option] = value;
    };

    this.update = function(cfgobj) {
        // Overwrite all given attributes (and leave the not given in place)
        // This will ensure sane defaults.
        for (var prop in this.config) {
            if (cfgobj.hasOwnProperty(prop)) {
                if(cfgobj[prop] != null) {
                    this.config[prop] = cfgobj[prop];
                }
            }
        }
    };
}

module.exports = ZettlrConfig;
