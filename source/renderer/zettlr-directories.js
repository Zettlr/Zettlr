/**
 * @ignore
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
 * This class acts as the intermediary between the actual directories in memory
 * and the visual experience of the user. It can refresh itself and change if
 * it intelligently detects changes, so all you need to do is call refresh() from
 * time to time, to reflect changes in memory visually.
 */
class ZettlrDirectories
{
    /**
     * Initialize the object
     * @param {ZettlrRenderer} parent The renderer object
     */
    constructor(parent)
    {
        this._renderer = parent;
        this._div = $('#directories');
        this._tree = null;
    }

    /**
     * Render a new directory list.
     * @return {ZettlrDirectories} Chainability.
     */
    refresh()
    {
        if(this._tree == null) {
            this._tree = new TreeView(this, this._renderer.getPaths(), true);
        } else {
            this._tree.refresh(this._renderer.getPaths());
        }

        return this;
    }

    /**
     * Empties the directory list.
     * @return {ZettlrDirectories} Chainability.
     */
    empty()
    {
        if(this._tree != null) {
            this._tree.detach(); // Will remove all descendants as well
            this._tree = null;   // Dereference
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
        if(this._tree != null) {
            this._tree.deselect();
            this._tree.select(hash);
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
    getContainer() { return this._div; }

    /**
     * Toggle the theme on the div.
     * @return {ZettlrDirectories} Chainability.
     */
    toggleTheme()
    {
        this._div.toggleClass('dark');
        return this;
    }

    /**
     * Show/Hide the complete list
     * @return {ZettlrDirectories} Chainability.
     */
    toggleDisplay()
    {
        this._div.toggleClass('hidden');
        return this;
    }

    /**
     * Needed for bubbling up of selections
     * @param  {Integer} hash The hash of the directory to be selected
     * @return {void}      Nothing to return.
     */
    requestDir(hash) { this._renderer.requestDir(hash); }

    /**
     * Needed for bubbling up of selections
     * @param  {Integer} from Hash representing the source dir
     * @param  {Integer} to   Hash representing the target dir
     * @return {void}      Nothing to return.
     */
    requestMove(from, to) { this._renderer.requestMove(from, to); }
}

module.exports = ZettlrDirectories;
