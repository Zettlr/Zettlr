/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileView class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Represents a file on disk.
 *
 * END HEADER
 */

class FileView
{
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

    _act()
    {
        // Request file on click
        this._elem.click((e) => {
            this._parent.requestFile(this.getHash());
        })
    }

    refresh(p = this._file)
    {
        if(p.modtime != this._file.modtime) {
            this._file = p;
            this._elem.attr('data-hash', this._file.hash);
            this._elem.attr('title', this._file.path);
            this._elem.text(this._file.name);
        }
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
     * @return {ListView} Chainability.
     */
    moveToTarget()
    {
        if((this._elem.index() == this._target) || !this._target) {
            return;
        } else if(this._target == 0) {
            this._elem.insertBefore(this._parent.getContainer().children().first());
        } else {
            this._elem.insertAfter(this._parent.getContainer().children()[this._target-1]);
        }

        return this;
    }

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

    setTarget(i)
    {
        this._target = i;
    }
}

module.exports = FileView;
