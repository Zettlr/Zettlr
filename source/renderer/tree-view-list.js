/**
 * BEGIN HEADER
 *
 * Contains:        TreeView class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This class represents the directory tree of the app. It can
 *                  recursively contain itself as subdirectories.
 *
 * END HEADER
 */

function TreeError(msg) {
    this.name = 'TreeView Error';
    this.message = msg;
};

/**
 * TreeView class
 */
class TreeView
{
    /**
     * Create a new tree view
     * @param {Mixed}  parent         Either ZettlrDirectories or TreeView
     * @param {Object}  paths          A tree to be displayed
     * @param {Boolean} [isRoot=false] Only set to true for the upmost TreeView
     */
    constructor(parent, paths, isRoot = false)
    {
        if(paths == null) {
            throw new TreeError('Paths must be given on instantiation!');
        }

        this.parent = parent;
        this.paths = paths; // Pointer to this dir's base object
        this.root = isRoot;
        this.hash = this.paths.hash; // Ease of access
        this.children = [];
        this.target = null;

        // Create the elements
        this.ul = $('<ul>').addClass('collapsed');
        if(!this.isRoot()) { this.ul.css('padding-left', '1em'); }

        this.indicator = $('<span>').addClass('collapse-indicator');

        this.dir = $('<li>').attr('data-hash', this.paths.hash).attr('title', this.paths.name);
        this.dir.append('<span>').text(this.paths.name);
        if(this.isRoot()) { this.dir.attr('id', 'root'); }

        // Append to DOM
        this.ul.append(this.dir);
        this.parent.getContainer().append(this.ul);

        // Activate event listeners
        this.activate();

        // Add children etc.
        this.refresh();
    }

    /**
     * Activates the tree view
     * @return {ListView} Chainability.
     */
    activate()
    {
        // Activate event listeners
        this.dir.on('click', () => { this.parent.requestDir(this.hash); });

        // Make draggable (unless root)
        if(!this.isRoot()) {
            this.dir.draggable({
                'cursorAt': { 'top': 0, 'left': 0},
                'scroll': false,
                'helper': function() {
                    return $(this)
                    .clone()
                    .appendTo('body')
                    .css('z-index', 1000)
                    .css('height', $(this).innerHeight())
                    .css('width', $(this).innerWidth())
                    .css('background-color', $(this).css('background-color'))
                    .css('color', $(this).css('color'))
                    .css('font-family', $(this).css('font-family'))
                    .css('padding', $(this).css('padding'))
                    .css('margin', $(this).css('margin'))
                    .css('list-style-type', $(this).css('list-style-type'));
                },
                'revert': "invalid", // Only revert if target was invalid
                'revertDuration': 200,
                'distance': 5
            });
        }
        // Also make droppable
        this.dir.droppable({
            'accept': 'li', // Only accept lis
            'tolerance': 'pointer', // The pointer must be over the droppable
            'drop': (e, ui) => {
                this.dir.removeClass('highlight');
                // requestMove: From, to
                this.parent.requestMove(parseInt(ui.draggable.attr('data-hash')), this.hash);
            },
            'over': (e, ui) => {
                this.dir.addClass('highlight');
            },
            'out': (e, ui) => {
                this.dir.removeClass('highlight');
            }
        });

        // Activate the indicator
        this.indicator.on('click', (e) => {
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
        this.ul.removeClass('collapsed');
        this.parent.uncollapse();
        return this;
    }

    /**
     * Selects a specific directory.
     * @param  {Integer} hash The hash representing the directory to be displayed.
     * @return {ListView}      Chainability.
     */
    select(hash)
    {
        if(this.hash == hash) {
            this.dir.addClass('selected');
            this.uncollapse();
        } else {
            for(let c of this.children) {
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
        if(this.isSelected()) { this.dir.removeClass('selected'); }
        for(let c of this.children) { c.deselect(); }
        return this;
    }

    /**
     * Refresh the directories lists.
     * @param  {Object} [p=this.paths] A new path object.
     * @return {ListView}                Chainability.
     */
    refresh(p = this.paths)
    {
        this.paths = p;
        // Then merge children
        this.merge();

        // Attach or detach the indicator based on whether there are children
        if(this.children.length > 0) {
            this.dir.prepend(this.indicator);
        } else {
            this.indicator.detach();
        }

        return this;
    }

    /**
     * Merge a new path object
     * @return {void} Don't return anything.
     */
    merge()
    {
        // First determine how many children there are in the new object
        let l = 0;
        for(let c of this.paths.children) {
            if(c.type == 'directory') {
                l++;
            }
        }
        // No children, so detach any that we may have and return.
        if(l == 0) {
            // Detach all children and return; nothing else to do.
            for(let c of this.children) {
                c.detach();
            }
            this.children = []; // Dereference
            return;
        }

        // Detach all children that are no longer present
        for(let dir of this.children) {
            if(!this.paths.children.find((elem) => {return (elem.hash == dir.hash);})) {
                dir.detach();
            }
        }

        // Allocate target array
        let target = new Array(l);

        // Iterate over the new children
        // i counts all children (incl. files), j only directories
        for(let i = 0, j = 0; i < this.paths.children.length; i++) {
            if(this.paths.children[i].type != 'directory') {
                continue;
            }
            // First check if we've already gotten that directory in our children
            let found = this.children.find((elem) => {return elem.hash == this.paths.children[i].hash;});
            if(found != undefined) {
                // Got it -> insert at correct position in target array and refresh
                target[j] = this.children[this.children.indexOf(found)];
                target[j].refresh(this.paths.children[i]);
            } else {
                // New directory -> add
                target[j] = new TreeView(this, this.paths.children[i]);
            }
            target[j].setTarget(j);
            // Increment after every dir
            j++;
        }

        // Swap
        this.children = target;

        // Now move to target
        for(let dir of this.children) {
            dir.moveToTarget();
        }
    }

    /**
     * Sets the DOM target for this directory.
     * @param {Integer} i The wanted target.
     */
    setTarget(i) { this.target = i; }

    /**
     * Detach from DOM
     * @return {void} Nothing to return.
     */
    detach() { this.ul.detach(); }

    /**
     * Moves the list to the target position.
     * @return {ListView} Chainability.
     */
    moveToTarget()
    {
        // +1 to account for the parent's <li>-tag
        if((this.ul.index() == this.target+1) || !this.target) {
            return;
        } else if(this.target == 0) {
            this.ul.insertBefore(this.parent.getContainer().children('ul')[0]);
        } else {
            this.ul.insertAfter(this.parent.getContainer().children('ul')[this.target-1]);
        }

        return this;
    }

    /**
     * Returns the DOM element
     * @return {jQuery} The DOM container element
     */
    getContainer() { return this.ul; }

    /**
     * Toggles the collapsed class.
     * @return {ListView} Chainability
     */
    toggleCollapse()
    {
        this.ul.toggleClass('collapsed');
        return this;
    }

    /**
     * Is this the root directory?
     * @return {Boolean} True, if this is the root directory, or false.
     */
    isRoot() { return this.root; }

    /**
     * Is this directory currently collapsed or open?
     * @return {Boolean} True, if the directory is uncollapsed.
     */
    isCollappsed() { return this.ul.hasClass('collapsed'); }

    /**
     * Is the directory currently selected?
     * @return {Boolean} True, if this directory is currently selected, else false.
     */
    isSelected() { return this.dir.hasClass('selected'); }

    /**
     * Needed for "bubbling up" of move requests from subdirs to ZettlrDirectories class.
     * @param  {Integer} from Hash of the source directory
     * @param  {Integer} to   Hash representing the target
     * @return {void}      Nothing to return.
     */
    requestMove(from, to) { this.parent.requestMove(from, to); }

    /**
     * Needed for "bubbling up" of move requests from subdirs to the ZettlrDirectories class.
     * @param  {Integer} hash The hash of the directory to select
     * @return {void}      Nothing to return.
     */
    requestDir(hash) { this.parent.requestDir(hash); }
}

module.exports = TreeView;
