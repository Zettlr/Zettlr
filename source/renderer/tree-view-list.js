/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TreeView class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class represents the directory tree of the app. It can
 *                  recursively contain itself as subdirectories.
 *
 * END HEADER
 */

const FileView = require('./file-view.js');

function TreeError(msg) {
    this.name = 'TreeView Error';
    this.message = msg;
};

/**
 * This class represents the directory tree on disk. To do this adequately, it
 * is a recursive class that can hold objects of itself.
 */
class TreeView
{
    /**
     * Create a new tree view
     * @param {Mixed}  parent         Either ZettlrDirectories or TreeView
     * @param {Object}  paths          A tree to be displayed
     * @param {Boolean} [isRoot=false] Only set to true for the upmost TreeView
     */
    constructor(parent, paths, level = 1, isRoot = false)
    {
        if(paths == null || typeof paths != 'object') {
            throw new TreeError('Paths must be given on instantiation!');
        }

        if(paths.type === 'file') {
            // It's a file, so silently replace this TreeView object
            // with a FileView (so sneaky!)
            return new FileView(parent, paths, isRoot);
        }

        this._parent = parent;
        this._paths = paths; // Pointer to this dir's base object
        this._root = isRoot;
        this._children = [];
        this._target = null;
        this._level = level;

        // Create the elements
        this._ul = $('<ul>').addClass('collapsed');
        // if(!this.isRoot()) { this._ul.css('padding-left', '1em'); }

        this._indicator = $('<span>').addClass('collapse-indicator');

        this._dir = $('<li>').attr('data-hash', this.getHash());
        if(!this.isRoot()) { this._dir.css('padding-left', this._level + 'em'); }
        this._dir.addClass(this._paths.type); // To ensure proper display of virtual directories and filters in different colours
        this._dir.append('<span>').text(this._paths.name);
        if(this.isRoot()) { this._dir.addClass('root'); }

        // Indicate that there is a project.
        if(paths.project != null) {
            this._dir.addClass('project');
        }

        // Append to DOM
        this._ul.append(this._dir);
        this._parent.getContainer().append(this._ul);

        // Activate event listeners
        this._act();

        // Add children etc.
        this.refresh();
    }

    /**
     * Activates the tree view
     * @return {ListView} Chainability.
     */
    _act()
    {
        // Activate event listeners
        this._dir.on('click', () => { this._parent.requestDir(this.getHash()); });

        // Make draggable (unless root or virtual directory)
        if(!this.isRoot() && this._paths.type != 'virtual-directory') {
            this._dir.draggable({
                'cursorAt': { 'top': 10, 'left': 10},
                'scroll': false,
                'helper': function() {
                    return $('<div>').addClass('dragger').text($(this).text()).appendTo('body');
                },
                'revert': "invalid", // Only revert if target was invalid
                'revertDuration': 200,
                'distance': 5
            });
        }
        // Also make droppable
        this._dir.droppable({
            'accept': 'li', // Only accept dragger-divs (the helper elements)
            'tolerance': 'pointer', // The pointer must be over the droppable
            'drop': (e, ui) => {
                this._dir.removeClass('highlight');
                // requestMove: From, to
                this._parent.requestMove(parseInt(ui.draggable.attr('data-hash')), this.getHash());
            },
            'over': (e, ui) => {
                this._dir.addClass('highlight');
            },
            'out': (e, ui) => {
                this._dir.removeClass('highlight');
            }
        });

        // Activate the indicator
        this._indicator.on('click', (e) => {
            e.stopPropagation();
            this.toggleCollapse();
        });

        return this;
    }

    /**
     * Open all trees leading to this specific tree.
     * @return {ListView} Chainability.
     */
    uncollapse()
    {
        this._ul.removeClass('collapsed');
        this._parent.uncollapse();
        return this;
    }

    /**
     * Selects a specific directory.
     * @param  {Integer} hash The hash representing the directory to be displayed.
     * @return {ListView}      Chainability.
     */
    select(hash)
    {
        if(this.getHash() == hash) {
            this._dir.addClass('selected');
            this.uncollapse();
        } else {
            for(let c of this._children) {
                c.select(hash);
            }
        }

        return this;
    }

    /**
     * Remove selection from all dirs.
     * @return {ListView} Chainability.
     */
    deselect()
    {
        if(this.isSelected()) { this._dir.removeClass('selected'); }
        for(let c of this._children) { c.deselect(); }
        return this;
    }

    /**
     * Refresh the directories lists.
     * @param  {Object} [p=this.paths] A new path object.
     * @return {ListView}                Chainability.
     */
    refresh(p = this._paths)
    {
        this._paths = p;
        // Then merge children
        this._merge();

        // Attach or detach the indicator based on whether there are children
        if(this._children.length > 0) {
            this._dir.prepend(this._indicator);
        } else {
            this._indicator.detach();
        }

        // Indicate that there is a project (if there is one)
        if(this._paths.project != null) {
            this._dir.addClass('project');
        } else {
            this._dir.removeClass('project');
        }

        return this;
    }

    /**
     * Merge a new path object
     * @return {void} Don't return anything.
     */
    _merge()
    {
        // First determine how many children there are in the new object
        let l = 0;
        for(let c of this._paths.children) {
            if(c.type != 'file') { // Only ignore files, display everything else (filters, virtual directories)
                l++;
            }
        }
        // No children, so detach any that we may have and return.
        if(l == 0) {
            // Detach all children and return; nothing else to do.
            for(let c of this._children) {
                c.detach();
            }
            this._children = []; // Dereference
            return;
        }

        // Detach all children that are no longer present
        for(let dir of this._children) {
            if(!this._paths.children.find((elem) => {return (elem.hash == dir.getHash());})) {
                dir.detach();
            }
        }

        // Allocate target array
        let target = new Array(l);

        // Iterate over the new children
        // i counts all children (incl. files), j only directories
        for(let i = 0, j = 0; i < this._paths.children.length; i++) {
            if(this._paths.children[i].type == 'file') { // Only ignore files, display everything else
                continue;
            }
            // First check if we've already gotten that directory in our children
            let found = this._children.find((elem) => {return elem.getHash() == this._paths.children[i].hash;});
            if(found != undefined) {
                // Got it -> insert at correct position in target array and refresh
                target[j] = this._children[this._children.indexOf(found)];
                target[j].refresh(this._paths.children[i]);
            } else {
                // New directory -> add
                target[j] = new TreeView(this, this._paths.children[i], this._level+1);
            }
            target[j].setTarget(j);
            // Increment after every dir
            j++;
        }

        // Swap
        this._children = target;

        // Now move to target
        for(let dir of this._children) {
            dir.moveToTarget();
        }
    }

    /**
     * Sets the DOM target for this directory.
     * @param {Integer} i The wanted target.
     */
    setTarget(i) { this._target = i; }

    /**
     * Detach from DOM
     * @return {void} Nothing to return.
     */
    detach() { this._ul.detach(); }

    /**
     * Moves the list to the target position.
     * @return {ListView} Chainability.
     */
    moveToTarget()
    {
        let mod = 0, selector = '';
        if(!this.isRoot()) {
            // +1 and selector as 'ul' to account for the parent's <li>-tag
            mod = 1;
            selector = 'ul';
        }

        if((this._ul.index() == this._target+mod) || this._target == null) {
            return this;
        } else if(this._target == 0) {
            this._ul.insertBefore(this._parent.getContainer().children(selector)[0]);
        } else {
            this._ul.insertAfter(this._parent.getContainer().children(selector)[this._target-mod]);
        }

        return this;
    }

    /**
     * Returns the DOM element
     * @return {jQuery} The DOM container element
     */
    getContainer() { return this._ul; }

    /**
     * Returns the hash associated with this specific TreeView
     * @return {Number} 32-Bit integer hash
     */
    getHash() { return this._paths.hash; }

    /**
     * Returns the path associated with this TreeView
     * @return {String} The path associated with this TreeView
     */
    getPath() { return this._paths.path; }

    /**
     * Toggles the collapsed class.
     * @return {ListView} Chainability
     */
    toggleCollapse()
    {
        this._ul.toggleClass('collapsed');
        return this;
    }

    /**
     * Is this the root directory?
     * @return {Boolean} True, if this is the root directory, or false.
     */
    isRoot() { return this._root; }

    /**
     * Returns false, as this represents not a file
     * @return {Boolean} Always returns false
     */
    isFile() { return false; }

    /**
     * Is this directory currently collapsed or open?
     * @return {Boolean} True, if the directory is uncollapsed.
     */
    isCollappsed() { return this._ul.hasClass('collapsed'); }

    /**
     * Is the directory currently selected?
     * @return {Boolean} True, if this directory is currently selected, else false.
     */
    isSelected() { return this._dir.hasClass('selected'); }

    /**
     * Needed for "bubbling up" of move requests from subdirs to ZettlrDirectories class.
     * @param  {Integer} from Hash of the source directory
     * @param  {Integer} to   Hash representing the target
     * @return {void}      Nothing to return.
     */
    requestMove(from, to) { this._parent.requestMove(from, to); }

    /**
     * Needed for "bubbling up" of move requests from subdirs to the ZettlrDirectories class.
     * @param  {Integer} hash The hash of the directory to select
     * @return {void}      Nothing to return.
     */
    requestDir(hash) { this._parent.requestDir(hash); }
}

module.exports = TreeView;
