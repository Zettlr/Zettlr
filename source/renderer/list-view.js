/**
 * BEGIN HEADER
 *
 * Contains:        ListViewItem class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This class represents the preview list
 *
 * END HEADER
 */

const { formatDate } = require('../common/zettlr-helpers.js');
const ListViewItem = require('./list-view-item.js');

/**
 * ListView class
 */
class ListView
{
    /**
     * Create the preview list
     * @param {ZettlrPreview} parent   The controller
     * @param {jQuery} elem     The #preview element.
     * @param {Boolean} snippets Show text fragments?
     */
    constructor(parent, elem, snippets)
    {
        this.parent = parent;
        this.element = elem; // For the key navigation
        this.container = $('<ul>').appendTo(this.element); // The only element our items should be involved with
        this.li = [];
        this.snippets = snippets;
        this.liSelected = null;

        // Activate arrow key navigation
        this.activate();
    }

    /**
     * Refreshes the list with new data
     * @param  {Object} data A ZettlrDir tree object
     * @return {ListView}      Chainability.
     */
    refresh(data)
    {
        if(this.li.length == 0) {
            // Initial call
            data = this.flattenTree(data);
             for(let d of data)
             {
                 this.li.push(new ListViewItem(this, d, this.snippets));
             }
        } else {
            // Each subsequent call
            let tmp = this.flattenTree(data);
            this.merge(tmp);
        }

        return this;
    }

    /**
     * Empty the list
     * @return {ListView} Chainability.
     */
    empty()
    {
        for(let li of this.li) {
            li.detach();
        }
        this.li = [];

        return this;
    }

    /**
     * Merges a new data object into the already existing object.
     * @param  {Object} nData A new ZettlrDir tree
     * @return {ListView}       Chainability.
     */
    merge(nData)
    {
        // First pre-allocate the target array
        let target = new Array(nData.length);

        // First detach all list items that are no longer present
        for(let li of this.li) {
            if(!nData.find((element) => {return (element.hash == li.hash);})) {
                li.detach();
            }
        }

        // Then iterate over the multiplication vector
        for(let i in nData) {

            // First lets search if we already got this element.
            let found = this.li.find((element) => {
                return (element.hash == nData[i].hash);
            });

            if(found !== undefined) {
                target[i] = this.li[this.li.indexOf(found)];
                // Also update if necessary
                target[i].update(nData[i]);
            } else {
                // Not found -> insert. The items will be inserted immediately
                // at the end of the list.
                target[i] = new ListViewItem(this, nData[i], this.snippets);
            }

            // Save the target position
            target[i].setTarget(i);
        }

        // Swap the old list with the new
        this.li = target;

        for(let li of this.li) {
            li.moveToTarget();
        }

        return this;
    }

    /**
     * Selects a specific element
     * @param  {Integer} hash The hash representing the file to select
     * @return {ListView}      Chainability.
     */
    select(hash)
    {
        for(let li of this.li) {
            if(li.hash == hash) {
                li.select();
                this.scrollIntoView(li.elem);
            } else {
                li.deselect();
            }
        }

        return this;
    }

    /**
     * Hide either the complete list (hash = null) or a specific element
     * @param  {Mixed} [hash=null] Integer or null
     * @return {ListView}             Chainability.
     */
    hide(hash = null)
    {
        if(hash == null) {
            for(let li of this.li) {
                li.hide();
            }
        } else {
            for(let li of this.li) {
                if(li.hash == hash) {
                    li.hide();
                    break;
                }
            }
        }

        return this;
    }

    /**
     * Show either the complete list (hash = null) or only a specific element.
     * @param  {Mixed} [hash=null] Integer representing a hash or null
     * @return {ListView}             Chainability.
     */
    show(hash = null)
    {
        if(hash == null) {
            for(let li of this.li) {
                li.show();
            }
        } else {
            for(let li of this.li) {
                if(li.hash == hash) {
                    li.show();
                    break;
                }
            }
        }
    }

    /**
     * Iterate over all list items, calling a function on each
     * @param  {Function} callback The callback to use for each element
     * @return {ListView}            Chainability.
     */
    each(callback)
    {
        let t = {};
        if(callback && t.toString.call(callback) == '[object Function]') {
            for(let li of this.li) {
                callback(li);
            }
        }

        return this;
    }

    /**
     * Toggles the snippets.
     * @return {ListView} Chainability.
     */
    toggleSnippets()
    {
        this.snippets = !this.snippets;
        for(let li of this.li) {
            li.toggleSnippets();
        }

        return this;
    }

    /**
     * Activate this list's event handlers.
     * @return {ListView} Chainability.
     */
    activate()
    {
        // Enable arrow key navigation
        this.element.on('keydown', (e) => {
            if(this.li.length == 0) {
                return;
            }

            // 38 is up, 40 is down
            if(e.which == 38) {
                e.preventDefault();
                if(!this.liSelected) {
                    return this.li[this.li.length-1].elem.click();
                }
                if(e.metaKey || e.ctrlKey) {
                    this.li[0].elem.click();
                    this.scrollIntoView(this.li[0].elem);
                } else {
                    let prev = this.findPrev();
                    prev.click();
                    this.scrollIntoView(prev);
                }
            } else if(e.which == 40) {
                e.preventDefault();
                if(!this.liSelected) {
                    return this.li[0].elem.click();
                }
                if(e.metaKey || e.ctrlKey) {
                    this.li[this.li.length-1].elem.click();
                    this.scrollIntoView(this.li[this.li.length-1].elem);
                } else {
                    let next = this.findNext();
                    next.click();
                    this.scrollIntoView(next);
                }
            }
        });

        return this;
    }

    /**
     * Finds the next valid (i.e. type = file) list item
     * @return {ListViewItem} The next valid item or the current.
     */
    findNext()
    {
        if(this.li.indexOf(this.liSelected)+1 == this.li.length) {
            return this.liSelected.elem;
        }

        let li = this.li[this.li.indexOf(this.liSelected)+1];

        while(li.isDirectory() && this.li.indexOf(li) < this.li.length) {
            li = this.li[this.li.indexOf(li)+1];
        }

        return li.elem;
    }

    /**
     * Finds the previous valid (type = directory) list item
     * @return {ListViewItem} The previous valid item (or the current)
     */
    findPrev()
    {
        if(this.li.indexOf(this.liSelected) == 0) {
            return this.liSelected.elem;
        }

        let li = this.li[this.li.indexOf(this.liSelected)-1];

        while(li.isDirectory() && this.li.indexOf(li) > 0) {
            li = this.li[this.li.indexOf(li)-1];
        }

        return li.elem;
    }

    /**
     * Request a new file. Triggered by a list view item.
     * @param  {ListViewItem} elem The item that requested the file
     * @return {void}      Nothing to return.
     */
    requestFile(elem)
    {
        this.liSelected = elem;
        // Refocus for arrow key navigation
        this.container.parent().focus();
        // Parent request
        this.parent.requestFile(elem.hash)
    }

    /**
     * Scroll a given item into view.
     * @param  {jQuery} elem The jQuery element representing the DOM element.
     * @return {void}      Nothing to return.
     */
    scrollIntoView(elem)
    {
        // Somehow it is impossible to write position().top into a variable.
        // Workaround: Short name for position and then use as pos.top ...
        let pos = elem.position();
        let bot = pos.top + elem.outerHeight();
        let docHeight = this.element.height();
        let curScroll = this.element.scrollTop();
        // Top:
        if(pos.top < 0) {
            // Here we need to also substract the height of a directory ribbon
            // because there WILL be one.
            let ribbonHeight = this.element.find('li.directory').first().outerHeight();
            this.element.scrollTop(curScroll + pos.top - ribbonHeight);
        }
        // Down:
        if(bot > docHeight) {
            this.element.scrollTop(curScroll + bot - docHeight);
        }
    }

    /**
     * This function flattens an object tree (file tree) to an array.
     * @param  {Object} data        A ZettlrDir tree
     * @param  {Array}  [newarr=[]] Needed for recursion
     * @return {Mixed}             An array or nothing.
     */
    flattenTree(data, newarr = [])
    {
        if(data == null) {
            return;
        }

        if(data.type == "file") {
            return newarr.push(data);
        } else if(data.type == "directory") {
            // Append directory (for easier overview)
            newarr.push(data);
            if(data.children != null) {
                for(let c of data.children) {
                    newarr.concat(this.flattenTree(c, newarr));
                }
            }
            return newarr;
        }
    }
}

module.exports = ListView;
