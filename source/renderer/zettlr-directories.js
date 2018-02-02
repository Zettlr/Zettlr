/* THIS CLASS CONTROLS THE DIRECTORIES-DIV */

const TreeView = require('./tree-view-list.js');

class ZettlrDirectories
{
    constructor(parent)
    {
        this.parent = parent;
        this.div = $('#directories');
        this.tree = null;
    }

    // Render a new directory list.
    refresh()
    {
        if(this.tree == null) {
            this.tree = new TreeView(this, this.parent.paths, true);
        } else {
            this.tree.refresh(this.parent.paths);
        }
    }

    empty()
    {
        if(this.tree == null) {
            return;
        }
        this.tree.detach(); // Will remove all descendants as well
        this.tree = null;   // Dereference
    }

    // Select another directory
    select(hash)
    {
        if(this.tree != null) {
            this.tree.deselect();
            this.tree.select(hash);
        }
    }

    uncollapse()
    {
        // Do nothing. Dummy function b/c recursion
    }

    getContainer() { return this.div; }

    toggleTheme() { this.div.toggleClass('dark'); }
    toggleDisplay() { this.div.toggleClass('hidden'); }

    requestDir(hash) { this.parent.requestDir(hash); }
    requestMove(from, to) { this.parent.requestMove(from, to); }
}

module.exports = ZettlrDirectories;
