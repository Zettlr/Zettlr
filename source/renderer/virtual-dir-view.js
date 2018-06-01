/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        VirtualDirView class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Represents a virtual directory.
 *
 * END HEADER
 */

class VirtualDirView
{
    constructor(parent, paths)
    {
        this._parent = parent;
        this._virtualdir = paths; // Pointer to this virtual directory's root object
        this._dirs = this._virtualdir._virtualDirectories; // The actual array of directories
        this._root = false; // Never root
        this._target = null;

        // Create the elements
        this._elem = $('<div>').addClass('virtualdir');

        // Append to DOM
        this._parent.getContainer().append(this._elem);

        // Activate event listeners
        this._act();

        // Add initial content TODO: Currently only first
        this._elem.text(this._dirs[0].name).attr('data-hash', this._virtualdir._dir.hash).attr('title', this._dirs[0].name);
    }

    _act()
    {
        // Request directory on click
        this._elem.click((e) => {
            // this._parent.requestFile(this.getHash());
        });
    }

    refresh(p = this._virtualdir)
    {
        // TODO
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

    deselect()
    {
        this._elem.removeClass('selected');
        return this;
    }

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

    getContainer() { return this._elem; }

    getHash() { return this._file.hash; }

    getPath() { return this._file.path; }
}

module.exports = VirtualDirView;
