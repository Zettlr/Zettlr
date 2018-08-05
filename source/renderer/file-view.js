/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileView class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Represents a root file on disk.
 *
 * END HEADER
 */

/**
 * The file view displays a single root file.
 */
class FileView
{
    /**
     * Create a new file view.
     * @param {ZettlrDirectories}  parent         The directories object
     * @param {Object}  paths          The paths object
     * @param {Boolean} [isRoot=false] Whether or not this is a root.
     */
    constructor(parent, paths, isRoot = false)
    {
        this._parent = parent;
        this._file = paths; // Pointer to this file's base object
        this._root = isRoot;
        this._target = null;

        // Create the elements
        this._elem = $('<div>').addClass('file');

        // Append to DOM
        this._parent.getContainer().append(this._elem);

        // Activate event listeners
        this._act();

        // Add initial content
        this._elem.text(paths.name).attr('data-hash', this._file.hash).attr('title', this._file.path);
    }

    /**
     * Activates the event listeners of this file.
     */
    _act()
    {
        // Request file on click
        this._elem.click((e) => {
            this._parent.requestFile(this.getHash());
        });
    }

    /**
     * Refreshes this file with new data.
     * @param  {Object} [p=this._file] The file object.
     * @return {FileView} This for chainability.
     */
    refresh(p = this._file)
    {
        if(p.modtime != this._file.modtime) {
            this._file = p;
            this._elem.attr('data-hash', this._file.hash);
            this._elem.attr('title', this._file.path);
            this._elem.text(this._file.name);
        }

        return this;
    }

    /**
     * Selects this file if the hash matches
     * @param  {Integer} hash The hash that should be selected
     * @return {FileView}      Chainability.
     */
    select(hash)
    {
        if(this.getHash() == hash) {
            this._elem.addClass('selected');
        } else {
            this.deselect();
        }

        return this;
    }

    /**
     * Unselects this file.
     * @return {FileView} This for chainability.
     */
    deselect()
    {
        this._elem.removeClass('selected');
        return this;
    }

    /**
     * Detaches the element from DOM.
     * @return {FileView} This for chainability.
     */
    detach()
    {
        this._elem.detach();
    }

    /**
     * Moves the list to the target position.
     * @return {FileView} Chainability.
     */
    moveToTarget()
    {
        if((this._elem.index() == this._target) || this._target == null) {
            return this;
        } else if(this._target == 0) {
            this._elem.insertBefore(this._parent.getContainer().children().first());
        } else {
            this._elem.insertAfter(this._parent.getContainer().children()[this._target]);
        }

        return this;
    }

    /**
     * Sets the DOM target for this file.
     * @param {Integer} i The wanted target.
     */
    setTarget(i) { this._target = i; }

    /**
     * Root level?
     * @return {Boolean} True, if this is on the root level.
     */
    isRoot() { return this._root; }

    /**
     * Returns true, as this represents a file
     * @return {Boolean} Always returns true
     */
    isFile() { return true; }

    /**
     * Is the file currently selected?
     * @return {Boolean} True, if this file is currently selected, else false.
     */
    isSelected() { return this._elem.hasClass('selected'); }

    /**
     * Returns the element of this file.
     * @return {DOMElement} The element.
     */
    getContainer() { return this._elem; }

    /**
     * Returns this file's hash.
     * @return {Number} The hash.
     */
    getHash() { return this._file.hash; }

    /**
     * Returns the path of this file.
     * @return {String} The path.
     */
    getPath() { return this._file.path; }
}

module.exports = FileView;
