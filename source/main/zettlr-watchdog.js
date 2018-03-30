/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrWatchdog class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Monitors the projectDir for external changes.
 *                  Some words on the ignoring array: We cannot simply pause()
 *                  and resume() the watchdog during save operations, because
 *                  the write process will trigger a change event after the save
 *                  process has stopped. This means that the actual event will
 *                  be fired by chokidar only AFTER resume() has been called
 *                  already. Therefore we will just be ignoring change events
 *                  for the specific path.
 *
 * END HEADER
 */

const path          = require('path');
const chokidar      = require('chokidar');

const { ignoreDir, ignoreFile } = require('../common/zettlr-helpers.js');

/**
 * This class enables some realtime monitoring features of Zettlr. As the Files
 * are unable to monitor changes by themselves, and a regular "pulse" would be
 * too resource-heavy, we've got chokidar, a file watcher that stages all changes
 * that have occurred on the disk and need to be handled with. To save even more
 * resources, we are only monitoring changes that are (1) not ignored, (2) not
 * in the blacklist of directories and (3) on the file whitelist.
 */
class ZettlrWatchdog
{
    /**
     * Create a new watcher instance
     * @param {String} path The path to projectDir
     */
    constructor(paths)
    {
        this._staged = [];
        this._ignored = [];
        this._ready = false;
        this._process = null;
        this._watch = false;
        this._paths = paths;
    }

    /**
     * Initiate watching process and stage all changes in the staged-array
     * @return {ZettlrWatchdog} This for chainability.
     */
    start()
    {
        // chokidar's ignored-setting is compatible to anymatch, so we can
        // pass an array containing the standard dotted directory-indicators,
        // directories that should be ignored and a function that returns true
        // for all files that are _not_ in the filetypes list (whitelisting)
        // Further reading: https://github.com/micromatch/anymatch
        let ignore_dirs = [/(^|[\/\\])\../];
        let d = require('../common/data.json').ignoreDirs;

        for(let x of d) {
            // Create new regexps from the strings
            ignore_dirs.push(new RegExp(x, 'i'));
        }

        // Begin watching the base dir.
        this._process = chokidar.watch(this._paths, {
            'ignored': ignore_dirs,
            'persistent': true,
            'ignoreInitial': true, // Do not track the initial watch as changes
            'followSymlinks': false, // Do not follow symlinks to other directories.
            'ignorePermissionErrors': true // In the worst case one has to reboot the software, but so it looks nicer.
        });

        this._process.on('ready', () => {
            this._watch = true;
            this._ready = true;
        });

        this._process.on('all', (event, p) => {
            if(this._watch) {
                // Should we ignore this event?
                for(let i in this._ignored) {
                    if(this._ignored[i].type == event && this._ignored[i].path == p) {
                        // We have ignored it once -> remove from array
                        this._ignored.splice(i, 1);
                        return;
                    }
                }

                let s;
                try {
                    s = fs.lstatSync(p);
                } catch(e) {
                    // On unlink, fsstat of course fails => imitate isDirectory()
                    // behavior
                    s = {
                        'isDirectory': function() {
                            return (event === 'unlinkDir') ? true : false;
                        }
                    };
                }

                // Only watch changes in directories and supported files
                if((s.isDirectory() && !ignoreDir(p)) || !ignoreFile(p)) {
                    this._staged.push({ 'type': event, 'path': p });
                }
            }
        });

        return this;
    }

    /**
     * Stop the watchdog completely (saves energy on pause because the process
     * is terminated)
     * @return {ZettlrWatchdog} This for chainability.
     */
    stop()
    {
        this._process.close();
        this._process = null;
        // Also flush all changes and ignores
        this._staged = [];
        this._ignored = [];
        this._watch = false;
        this._ready = false;
    }

    /**
     * Temporarily pause the watchdog (don't stage changes)
     * @return {ZettlrWatchdog} This for chainability.
     */
    pause()
    {
        this._watch = false;
        return this;
    }

    /**
     * Resumes watching (e.g. putting changes into the array)
     * @return {ZettlrWatchdog} This for chainability.
     */
    resume()
    {
        this._watch = true;
        return this;
    }

    /**
     * Is the instance currently logging changes?
     * @return {Boolean} True or false depending on watch flag.
     */
    isWatching() { return this._watch; }

    /**
     * Is chokidar done with its initial scan?
     * @return {Boolean} True or false depending on the start sequence.
     */
    isReady() { return this._ready; }

    /**
     * Return all staged changes
     * @return {array} Array containing all change objects.
     */
    getChanges() { return this._staged; }

    /**
     * Returns number of staged changes
     * @return {Integer} The amount of changes
     */
    countChanges() { return this._staged.length; }

    /**
     * Remove all changes from array.
     * @return {ZettlrWatchdog} This for chainability.
     */
    flush()
    {
        this._staged = [];
        return this;
    }

    /**
     * Sets the path to be watched
     * @param {String} path A new directory to be watched.
     * @return {ZettlrWatchdog} This for chainability.
     */
    setPath(paths)
    {
        this._paths = paths;
        return this;
    }

    /**
     * Adds a path to the currently watched paths
     * @param {String} p A new directory or file to be watched
     * @return {ZettlrWatchdog} This for chainability.
     */
    addPath(p)
    {
        if(this._paths.includes(p)) {
            return this;
        }

        // Add the path to the watched
        this._paths.push(p);
        this._process.add(p);

        return this;
    }

    /**
     * Removes a path from the watchdog process
     * @param  {String} p The path to be unwatched
     * @return {ZettlrWatchdog}   This for chainability
     */
    removePath(p)
    {
        if(!this._paths.includes(p)) {
            // Not being watched, so ignore
            return this;
        }

        this._paths.splice(this._paths.indexOf(p), 1);
        this._process.unwatch(p);

        return this;
    }

    /**
     * Restart the watchdog service
     * @return {ZettlrWatchdog} This for chainability.
     */
    restart()
    {
        if(this._process != null) {
            this.stop();
        }

        this.start();

        return this;
    }

    /**
     * Iterate over all staged changes with a callback
     * @param  {Function} callback A function to be called for each change.
     * @return {ZettlrWatchdog}            This for chainability.
     */
    each(callback)
    {
        let t = {};
        if(callback && t.toString.call(callback) === '[object Function]') {
            for(let change of this._staged) {
                callback(change.type, change.path);
            }
        }

        return this;
    }

    /**
     * Ignore the next event of type evt for path "path"
     * Useful to ignore save events from the editor
     * @param  {String} evt  Event to be ignored
     * @param  {String} path Absolute path
     * @return {ZettlrWatchdog}      This for ... dude, you know why we return this.
     */
    ignoreNext(evt, path)
    {
        this._ignored.push({ 'type': evt, 'path': path });
        return this;
    }
}

module.exports = ZettlrWatchdog;
