/*
* ZettlrConfig
*
* This class fulfills two basic tasks:
*
* 1.) Manage the app's configuration, stored in the config.json inside the
* user data directory.
*
* 2.) Check the environment whether or not specific conditions exist (such as
* the pandoc or pdflatex binaries)
*/

const fs            = require('fs');
const path          = require('path');
const {app}         = require('electron');
const commandExists = require('command-exists').sync; // Does a given shell command exist?

class ZettlrConfig
{
    constructor(parent)
    {
        this.parent = parent;
        this.configPath = app.getPath('userData');
        this.configFile = path.join(this.configPath, 'config.json');
        this.config = null;

        this.env = {
            'pandoc': false,
            'pdflatex': false
        };

        this.supportedLangs = [
            'de_DE',
            'fr_FR',
            'en_US',
            'en_GB'
        ];

        // Config Template providing all necessary arguments
        this.cfgtpl = {
            "projectDir": app.getPath('documents'),
            "darkTheme" : false,
            "snippets"  : true,
            "pandoc"    : 'pandoc',
            "pdflatex"  : 'pdflatex',
            "spellcheck": {
                'en_US' : (this.getLocale() === 'en_US') ? true : false,
                'en_GB' : (this.getLocale() === 'en_GB') ? true : false,
                'de_DE' : (this.getLocale() === 'de_DE') ? true : false,
                'fr_FR' : (this.getLocale() === 'fr_FR') ? true : false
            },
            "app_lang": this.getLocale(),
            "debug": false
        };

        // Load the configuration
        this.load();

        // Run system check
        this.checkSystem();
    }

    // This function only (re-)reads the configuration file if present
    load()
    {
        this.config = this.cfgtpl;
        let readConfig = {};

        // Check if dir exists. If not, create.
        try {
            let stats = fs.lstatSync(this.configPath);
        } catch(e) {
            fs.mkdirSync(this.configPath);
        }

        // Does the file already exist?
        try {
            let stats = fs.lstatSync(this.configFile);
            readConfig = JSON.parse(fs.readFileSync(this.configFile, { encoding: 'utf8' }));
        } catch(e) {
            fs.writeFileSync(this.configFile, JSON.stringify(this.cfgtpl), { encoding: 'utf8' });
            this.config = this.cfgtpl;
            return; // No need to iterate over objects anymore
        }

        this.update(readConfig);

        // Check whether the project dir still exists, if not default to documents
        try {
            let stats = fs.lstatSync(this.config.projectDir);
        } catch(e) {
            // Doesn't exist, so revert to default
            this.config.projectDir = app.getPath('documents');
        }
    }

    // Write the config (e.g. on app exit)
    save()
    {
        if(this.configFile == null || this.config == null) {
            this.load();
        }
        // (Over-)write the configuration
        fs.writeFileSync(this.configFile, JSON.stringify(this.config), { encoding: 'utf8' });
    }

    // This function runs a general environment check and tries to determine
    // some environment variables (such as the existence of pandoc or pdflatex)
    checkSystem()
    {
        // Check pandoc availability (general exports)
        if(commandExists(this.get('pandoc'))) {
            this.env.pandoc = true;
        }

        // Check PDFLaTeX availability (PDF exports)
        if(commandExists(this.get('pdflatex'))) {
            this.env.pdflatex = true;
        }

        // This function returns the platform specific template dir for pandoc
        // template files. This is based on the electron-builder options
        // See https://www.electron.build/configuration/contents#extraresources
        // Quote: "Contents/Resources for MacOS, resources for Linux and Windows"
        let dir = path.dirname(app.getPath('exe')); // Get application directory

        if(process.platform === 'darwin') {
            // The executable lies in Contents/MacOS --> navigate up a second time
            dir = path.dirname(dir);

            // macos is capitalized "Resources", not "resources" in lowercase
            dir = path.join(dir, 'Resources');
        } else {
            dir = path.join(dir, 'resources');
        }

        this.env.templateDir = path.join(dir, 'pandoc');

        // We have the problem that pandoc version 2 does not recognize pdflatex
        // given with the --pdf-engine command. It does work, though, if it finds
        // it in path. So instead of passing it directly, let us just insert it into
        // electron's PATH
        if(path.dirname(this.get('pdflatex')).length > 0) {
            // In the config the user saved a whole path, so obviously pandoc
            // did not see pdflatex -> insert into path
            if(process.env.PATH.indexOf(path.dirname(this.get('pdflatex'))) == -1) {
                let delimiter = '';
                if(process.platform === 'win32') {
                    delimiter = ';';
                } else {
                    delimiter = ':';
                }
                process.env.PATH += delimiter + path.dirname(this.get('pdflatex'));
            }
        }
    }

    // Get an option
    get(attr)
    {
        if(this.config.hasOwnProperty(attr)){
            return this.config[attr];
        } else {
            return null;
        }
    }

    // Get an environment variable
    getEnv(attr)
    {
        if(this.env.hasOwnProperty(attr)) {
            return this.env[attr];
        } else {
            return null;
        }
    }

    // Returns the language (but always specified in the form <main>_<sub>,
    // b/c we rely on it). If no "sub language" is given (e.g. only en, fr or de),
    // then we assume the primary language (e.g. this function returns en_US for en,
    // fr_FR for fr and de_DE for de. And yes, I know that British people won't
    // like me for that. I'm sorry.)
    getLocale()
    {
        let lang = app.getLocale();
        let mainlang = null;

        if(lang.indexOf('-') > -1) {
            // Specific sub-lang
            mainlang = lang.split('-')[0];
            lang = lang.split('-')[1];
        } else {
            // Only mainlang
            mainlang = lang;
            lang = null;
        }

        for(let sup of this.supportedLangs) {
            let ml = sup.split('_')[0];
            let sl = sup.split('_')[1];
            if(ml === mainlang) {
                if(lang === null) {
                    return sup;
                } else {
                    if(sl === lang) {
                        return sup;
                    }
                }
            }
        }

        return 'en_US'; // Fallback default
    }

    getSupportedLangs()
    {
        return this.supportedLangs;
    }

    // Set an option
    set(option, value)
    {
        this.config[option] = value;
    }

    update(newcfg, oldcfg = this.config)
    {
        // Overwrite all given attributes (and leave the not given in place)
        // This will ensure sane defaults.
        for (var prop in oldcfg) {
            if (newcfg.hasOwnProperty(prop) && (newcfg[prop] != null)) {
                    if(typeof newcfg[prop] === 'object') {
                        // Update sub-object
                        this.update(newcfg[prop], oldcfg[prop]);
                    } else {
                        oldcfg[prop] = newcfg[prop];
                    }
            }
        }
    }
}

module.exports = ZettlrConfig;
