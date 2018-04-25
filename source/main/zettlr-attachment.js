/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrAttachment class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class represents one of the attachment files on disk
 *                  that can be referenced from within the app. They'll do not
 *                  much besides simply existing and being visible to the user.
 *
 * END HEADER
 */

const path = require('path');
const {hash} = require('../common/zettlr-helpers.js');

/**
 * This class simply manages all non-markdown files in directories. Basically a
 * ZettlrFile clone with much less functionality.
 */
class ZettlrAttachment
{
    /**
     * Create a new instance of ZettlrAttachment.
     * @param {ZettlrDir} parent The containing dir.
     * @param {String} fname  The full path to the attachment.
     */
    constructor(parent, fname)
    {
        this.dir = parent;
        this.path = fname;
        this.name = path.basename(this.path);
        this.hash = hash(this.path);
        this.ext  = path.extname(this.path);
        this.canDrag = false; // Can the user drag it into the editor?
    }

    /**
     * Handles an event emitted by the watchdog
     * @param  {String} p The path to test against
     * @param  {String} e The event to handle
     */
    handleEvent(p, e)
    {
        if(this.isScope(p) === this) {
            // Only in this case may we handle the event. Possible events:
            // change, unlink
            if(e === 'change') {
                this.update().parent.notifyChange(`File ${this.name} has changed remotely.`);
            } else if(e === 'unlink') {
                this.parent.notifyChange(`File ${this.name} has been removed.`);
                this.remove();
            }
        }
    }

    /**
     * Removes the file from disk and also from containing dir.
     * @return {Boolean} The return value of the remove operation on parent
     */
    remove()
    {
        shell.moveItemToTrash(this.path);
        return this.parent.remove(this);
    }

    /**
     * Checks whether or not the given path p is in the scope of this object
     * @param  {String}  p The path to test
     * @return {Mixed}   "this" if p equals path, false otherwise.
     */
    isScope(p)
    {
        if(p === this.path) {
            return this;
        }

        return false;
    }

    /**
     * Returns the hash of the file
     * @return {Number} The hash
     */
    getHash() { return this.hash; }

    /**
     * Returns the file path
     * @return {String} The path
     */
    getPath() { return this.path; }

    /**
     * Returns the file name
     * @return {String} The file name
     */
    getName() { return this.name; }

    // Dummy functions (either for recursive use or because their return val is obvious)

    /**
     * Dummy function for recursive use. Always returns false.
     * @return {Boolean} Always returns false.
     */
    isDirectory() { return false; }

    /**
     * Dummy function for recursive use. Always returns false.
     * @return {Boolean} Always returns false.
     */
    isFile()      { return false;  }

    /**
     * Dummy function for recursive use. Always returns true.
     * @return {Boolean} Always returns true.
     */
    isAttachment() { return true; }

    /**
     * Dummy function for recursive use. Always returns false.
     * @param  {Mixed} obj Either ZettlrFile or ZettlrDir
     * @return {Boolean}     Always return false, because a file cannot contain another.
     */
    contains(obj) { return false; }

    /**
     * Dummy function for recursive use. Always returns null.
     * @param  {Mixed} obj Either ZettlrFile or ZettlrDir
     * @return {null}     Always return null.
     */
    findDir(obj)  { return null;  }
}

module.exports = ZettlrAttachment;
