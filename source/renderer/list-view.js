/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ListViewItem class
 * CVM-Role:        View
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
 * This is an intermediary list class that generates and maintains the preview
 * pane.
 */
class ListView
{
    /**
     * Create the preview list
     * @param {ZettlrPreview} parent   The controller
     * @param {jQuery} elem     The #preview element.
     * @param {Boolean} snippets Show text fragments?
     */
    constructor(zetPreview, elem, snippets)
    {
        this._preview = zetPreview;
        this._elem = elem; // For the key navigation
        this._container = $('<ul>').appendTo(this._elem); // The only element our items should be involved with
        this._li = [];
        this._snippets = snippets;
        this._liSelected = null;

        // Activate arrow key navigation
        this._activate();
    }

    /**
     * Refreshes the list with new data
     * @param  {Object} data A ZettlrDir tree object
     * @return {ListView}      Chainability.
     */
    refresh(data)
    {
        if(this._li.length == 0) {
            // Initial call
            data = this._flattenTree(data);
             for(let d of data)
             {
                 this._li.push(new ListViewItem(this, d, this._snippets));
             }
        } else {
            // Each subsequent call
            let tmp = this._flattenTree(data);
            this._merge(tmp);
        }

        return this;
    }

    /**
     * Empty the list
     * @return {ListView} Chainability.
     */
    empty()
    {
        for(let li of this._li) {
            li.detach();
        }
        this._li = [];

        return this;
    }

    /**
     * Merges a new data object into the already existing object.
     * @param  {Object} nData A new ZettlrDir tree
     * @return {ListView}       Chainability.
     */
    _merge(nData)
    {
        // First pre-allocate the target array
        let target = new Array(nData.length);

        // First detach all list items that are no longer present
        for(let li of this._li) {
            if(!nData.find((element) => {return (element.hash == li.getHash());})) {
                li.detach();
            }
        }

        // Then iterate over the multiplication vector
        for(let i in nData) {

            // First lets search if we already got this element.
            let found = this._li.find((li) => {
                return (li.getHash() == nData[i].hash);
            });

            if(found !== undefined) {
                target[i] = this._li[this._li.indexOf(found)];
                // Also update if necessary
                target[i].update(nData[i]);
            } else {
                // Not found -> insert. The items will be inserted immediately
                // at the end of the list.
                target[i] = new ListViewItem(this, nData[i], this._snippets);
            }

            // Save the target position
            target[i].setTarget(i);
        }

        // Swap the old list with the new
        this._li = target;

        for(let li of this._li) {
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
        for(let li of this._li) {
            if(li.getHash() == hash) {
                li.select();
                this._scrollIntoView(li);
            } else {
                li.deselect();
            }
        }

        return this;
    }

    /**
     * Simply deselect any selection
     * @return {ListView} Chainability
     */
    deselect()
    {
        for(let li of this._li) {
            li.deselect();
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
            for(let li of this._li) {
                li.hide();
            }
        } else {
            for(let li of this._li) {
                if(li.getHash() == hash) {
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
            for(let li of this._li) {
                li.show();
            }
        } else {
            for(let li of this._li) {
                if(li.getHash() == hash) {
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
            for(let li of this._li) {
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
        this._snippets = !this._snippets;
        for(let li of this._li) {
            li.toggleSnippets();
        }

        return this;
    }

    /**
     * Activate this list's event handlers.
     * @return {ListView} Chainability.
     */
    _activate()
    {
        // Enable arrow key navigation
        this._elem.on('keydown', (e) => {
            if(this._li.length == 0) {
                return;
            }

            // 38 is up, 40 is down
            if(e.which == 38) {
                e.preventDefault();
                if(!this._liSelected) {
                    return this._li[this._li.length-1].click();
                }
                if(e.metaKey || e.ctrlKey) {
                    this._li[0].click();
                    this._scrollIntoView(this._li[0]);
                } else {
                    let prev = this._findPrev();
                    prev.click();
                    this._scrollIntoView(prev);
                }
            } else if(e.which == 40) {
                e.preventDefault();
                if(!this._liSelected) {
                    return this._li[0].click();
                }
                if(e.metaKey || e.ctrlKey) {
                    this._li[this._li.length-1].click();
                    this._scrollIntoView(this._li[this._li.length-1]);
                } else {
                    let next = this._findNext();
                    next.click();
                    this._scrollIntoView(next);
                }
            }
        });

        return this;
    }

    /**
     * Finds the next valid (i.e. type = file) list item
     * @return {ListViewItem} The next valid item or the current.
     */
    _findNext()
    {
        if(this._li.indexOf(this._liSelected)+1 == this._li.length) {
            return this._liSelected;
        }

        let li = this._li[this._li.indexOf(this._liSelected)+1];

        while(li.isDirectory() && this._li.indexOf(li) < this._li.length) {
            li = this._li[this._li.indexOf(li)+1];
        }

        return li;
    }

    /**
     * Finds the previous valid (type = directory) list item
     * @return {ListViewItem} The previous valid item (or the current)
     */
    _findPrev()
    {
        if(this._li.indexOf(this._liSelected) == 0) {
            return this._liSelected;
        }

        let li = this._li[this._li.indexOf(this._liSelected)-1];

        while(li.isDirectory() && this._li.indexOf(li) > 0) {
            li = this._li[this._li.indexOf(li)-1];
        }

        return li;
    }

    /**
     * Request a new file. Triggered by a list view item.
     * @param  {ListViewItem} elem The item that requested the file
     * @return {void}      Nothing to return.
     */
    requestFile(elem)
    {
        this._liSelected = elem;
        // Refocus for arrow key navigation
        this._container.parent().focus();
        // Parent request
        this._preview.requestFile(elem.getHash())
    }

    /**
     * Scroll a given item into view.
     * @param  {jQuery} lielem The jQuery element representing the DOM element.
     * @return {void}      Nothing to return.
     */
    _scrollIntoView(lielem)
    {
        let elem = lielem.getElem();
        // Somehow it is impossible to write position().top into a variable.
        // Workaround: Short name for position and then use as pos.top ...
        let pos = elem.position();
        let bot = pos.top + elem.outerHeight();
        let docHeight = this._elem.height();
        let curScroll = this._elem.scrollTop();
        // Top:
        if(pos.top < 0) {
            // Here we need to also substract the height of a directory ribbon
            // because there WILL be one.
            let ribbonHeight = this._elem.find('li.directory').first().outerHeight();
            this._elem.scrollTop(curScroll + pos.top - ribbonHeight);
        }
        // Down:
        if(bot > docHeight) {
            this._elem.scrollTop(curScroll + bot - docHeight);
        }
    }

    /**
     * This function flattens an object tree (file tree) to an array.
     * @param  {Object} data        A ZettlrDir tree
     * @param  {Array}  [newarr=[]] Needed for recursion
     * @return {Mixed}             An array or nothing.
     */
    _flattenTree(data, newarr = [])
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
                    newarr.concat(this._flattenTree(c, newarr));
                }
            }
            return newarr;
        }
    }

    // GETTERS

    /**
     * Returns the container object of this list view
     * @return {jQuery} Container DOM element wrapped by jQuery
     */
    getContainer() { return this._container; }
}

module.exports = ListView;
