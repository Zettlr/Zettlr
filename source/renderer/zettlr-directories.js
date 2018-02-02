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

    getContainer() { return this.div; }

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
        this.tree.detach(); // Will remove all descendants as well
        this.tree = null; // Dereference
    }

    toggleTheme() { this.div.toggleClass('dark'); }
    toggleDisplay() { this.div.toggleClass('hidden'); }

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

    requestDir(hash) { this.parent.requestDir(hash); }
    requestMove(from, to) { this.parent.requestMove(from, to); }

    scrollIntoView(elem)
    {
        // Do we have an element to scroll?
        if(!elem.length) {
            return;
        }

        // Somehow it is impossible to write position().top into a variable.
        // Workaround: Short name for position and then use as pos.top ...
        let pos = elem.position();
        let bot = pos.top + elem.outerHeight();
        let docHeight = this.div.height();
        let curScroll = this.div.scrollTop();
        // Top:
        if(pos.top < 0) {
            this.div.scrollTop(curScroll + pos.top);
        }
        // Down:
        if(bot > docHeight) {
            this.div.scrollTop(curScroll + bot - docHeight);
        }
    }
}

module.exports = ZettlrDirectories;
