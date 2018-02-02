// Generate a list view out of a dom-element

const { formatDate } = require('../common/zettlr-helpers.js');
const ListViewItem = require('./list-view-item.js');

// Generate a list from a data-object
class ListView
{
    constructor(parent, elem, snippetsHidden)
    {
        this.parent = parent;
        this.element = elem; // For the key navigation
        this.container = $('<ul>').appendTo(this.element); // The only element our items should be involved with
        this.li = [];
        this.snippets = true;
        this.liSelected = null;

        // Activate arrow key navigation
        this.activate();
    }

    // Refreshens the data in the tree
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
    }

    // Empties the list
    empty()
    {
        for(let li of this.li) {
            li.detach();
        }
        this.li = [];
    }

    // Merges the nData object into this list's tree
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
    }

    // Selects a specific element
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
    }

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
    }

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

    each(callback)
    {
        let t = {};
        if(callback && t.toString.call(callback) == '[object Function]') {
            for(let li of this.li) {
                callback(li);
            }
        }
    }

    // Toggles the snippets on and off
    toggleSnippets()
    {
        this.snippets = !this.snippets;
        for(let li of this.li) {
            li.toggleSnippets();
        }
    }

    // Activate this list's event handlers
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
    }

    // Find a valid next list element
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

    // Find a valid previous list element
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

    // Request a file
    requestFile(elem)
    {
        this.liSelected = elem;
        // Refocus for arrow key navigation
        this.container.parent().focus();
        // Parent request
        this.parent.requestFile(elem.hash)
    }

    // Scrolls the given ListViewItem into view
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

    // This function flattens an object tree (file tree) to an array.
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
