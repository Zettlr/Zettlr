// Class for a single Tree-View Directory. Can contain recursively other dirs.

function TreeError(msg) {
    this.name = 'TreeView Error';
    this.message = msg;
};

class TreeView
{
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
                this.parent.requestMove(ui.draggable.attr('data-hash'), this.hash);
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
    }

    uncollapse()
    {
        this.ul.removeClass('collapsed');
        this.parent.uncollapse();
    }

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
    }

    deselect()
    {
        if(this.isSelected()) { this.dir.removeClass('selected'); }
        for(let c of this.children) { c.deselect(); }
    }

    // Refresh
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
    }

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

    setTarget(i) { this.target = i; }
    detach() { this.ul.detach(); }

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
    }

    getContainer() { return this.ul; }

    toggleCollapse() { this.ul.toggleClass('collapsed'); }

    isRoot() { return this.root; }
    isCollappsed() { return this.ul.hasClass('collapsed'); }
    isSelected() { return this.dir.hasClass('selected'); }

    // Easy bubble-up of the functions
    requestMove(from, to) { this.parent.requestMove(from, to); }
    requestDir(hash) { this.parent.requestDir(hash); }
}

module.exports = TreeView;
