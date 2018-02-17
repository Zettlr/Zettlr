/**
 * BEGIN HEADER
 *
 * Contains:        ZettlrDialog class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This class controls the directory tree view
 *
 * END HEADER
 */

const TreeView = require('./tree-view-list.js');

/**
 * ZettlrDirectories class
 */
class ZettlrDirectories
{
    /**
     * Initialize the object
     * @param {ZettlrRenderer} parent The renderer object
     */
    constructor(parent)
    {
        this.parent = parent;
        this.div = $('#directories');
        this.tree = null;
    }

    /**
     * Render a new directory list.
     * @return {ZettlrDirectories} Chainability.
     */
    refresh()
    {
        if(this.tree == null) {
            this.tree = new TreeView(this, this.parent.paths, true);
        } else {
            this.tree.refresh(this.parent.paths);
        }

        return this;
    }

    /**
     * Empties the directory list.
     * @return {ZettlrDirectories} Chainability.
     */
    empty()
    {
        if(this.tree != null) {
            this.tree.detach(); // Will remove all descendants as well
            this.tree = null;   // Dereference
        }
        return this;
    }

    /**
     * Select a directory (i.e. a TreeView)
     * @param  {Integer} hash The hash of the tree view that should be selected
     * @return {ZettlrDirectories}      Chainability.
     */
    select(hash)
    {
        if(this.tree != null) {
            this.tree.deselect();
            this.tree.select(hash);
        }

        return this;
    }

    /**
     * Purely dummy function for recursive use of uncollapse. Does simply put: NOTHING.
     * @return {void} This function does nothing, it returns nothing, it is nothing.
     */
    uncollapse()
    {
        // Do nothing. Dummy function b/c recursion
    }

    /**
     * Returns the directory container (#directories)
     * @return {jQuery} The DOM element
     */
    getContainer() { return this.div; }

    /**
     * Toggle the theme on the div.
     * @return {ZettlrDirectories} Chainability.
     */
    toggleTheme()
    {
        this.div.toggleClass('dark');
        return this;
    }

    /**
     * Show/Hide the complete list
     * @return {ZettlrDirectories} Chainability.
     */
    toggleDisplay()
    {
        this.div.toggleClass('hidden');
        return this;
    }

    /**
     * Needed for bubbling up of selections
     * @param  {Integer} hash The hash of the directory to be selected
     * @return {void}      Nothing to return.
     */
    requestDir(hash) { this.parent.requestDir(hash); }

    /**
     * Needed for bubbling up of selections
     * @param  {Integer} from Hash representing the source dir
     * @param  {Integer} to   Hash representing the target dir
     * @return {void}      Nothing to return.
     */
    requestMove(from, to) { this.parent.requestMove(from, to); }
}

module.exports = ZettlrDirectories;
