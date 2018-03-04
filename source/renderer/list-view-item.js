/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ListViewItem class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This class represents a single list view item in the preview
 *
 * END HEADER
 */

const { formatDate } = require('../common/zettlr-helpers.js');

/**
 * This class is a view that deals only with displaying one single item of the
 * list view (the preview pane). Therefore it can be a directory or a file.
 * Necessary actions like dragging and dropping are also handled on such a basis.
 */
class ListViewItem
{
    /**
     * Construct and append the list view item
     * @param {ListView} parent   The list
     * @param {Mixed} fileobj  ZettlrFile or ZettlrDir that should be displayed
     * @param {Boolean} snippets Whether or not to show the text fragment
     */
    constructor(parent, fileobj, snippets)
    {
        this.parent = parent;
        this.fileObj = fileobj;
        this.hash = this.fileObj.hash; // Associate for ease
        this.snippets = snippets;
        this.target = -1;
        // Create the element
        this.elem = $('<li>')
        .addClass(this.fileObj.type)
        .attr('data-hash', this.fileObj.hash)
        .attr('title', this.fileObj.name);

        // Populate
        if(this.fileObj.type == 'directory') {
            this.elem.html(this.fileObj.name);
        } else if (this.fileObj.type == 'file') {
            this.elem.append(
                $('<strong>').text(
                    this.fileObj.name.substr(0, this.fileObj.name.lastIndexOf('.'))
                )
            );
            this.elem.append($('<br>'));
            this.elem.append(
                $('<span>').addClass('snippet')
                .text(this.fileObj.snippet)
                .append($('<br>'))
                .append(
                    $('<small>').text(formatDate(new Date(this.fileObj.modtime)))
                )
            );
        }

        // Add class if necessary
        if(!this.snippets) {
            this.elem.find('.snippet').first().addClass('hidden');
        }

        // Attach to element and activate listeners
        this.parent.container.append(this.elem);
        this.act();
    }

    /**
     * Activate the element
     * @return {ListViewItem} Chainability.
     */
    act()
    {
        // Only activate files
        if(this.fileObj.type == 'directory') {
            return;
        }

        this.elem.on('click', () => {
            if(this.isSelected()) {
                return;
            }

            this.parent.requestFile(this);
        });

        this.elem.draggable({
            'cursorAt': { 'top': 0, 'left': 0},
            'scroll': false,
            'helper': function() {
                // Return a clone attached to the body (movable through the whole view)
                // and that has the same CSS classes
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
            'distance': 5,
        });

        return this;
    }

    /**
     * Moves the DOM element to the correct index position
     * @return {ListViewItem} Chainability
     */
    moveToTarget()
    {
        if(this.elem.index() == this.target) {
            return this;
        } else if(this.target == 0) {
            this.elem.insertBefore(this.parent.container.find('li')[0]);
        } else {
            this.elem.insertAfter(this.parent.container.find('li')[this.target-1]);
        }

        return this;
    }

    /**
     * Update the displayed properties
     * @param  {Mixed} nData The new ZettlrFile or ZettlrDir object
     * @return {ListViewItem}       Chainability.
     */
    update(nData)
    {
        if(this.fileObj.type == 'directory') {
            // Names are updated by unlinking only because they change the hash.
            return this;
        }

        // Update if necessary
        if(nData.snippet != this.fileObj.snippet || this.fileObj.modtime != nData.modtime) {
            this.elem.find('.snippet').html(`${nData.snippet}<br><small>${formatDate(new Date(this.fileObj.modtime))}</small>`);
        }

        return this;
    }

    /**
     * Get the actual index of the DOM element
     * @return {Integer} The DOM element's index
     */
    getPos()         { return this.elem.index(); }

    /**
     * Get the correct index for the DOM element
     * @return {Integer} The target position of the DOM element
     */
    getTarget()      { return this.target; }

    /**
     * Set the target of this item's DOM element
     * @param {Integer} i Zero-based target index
     * @return {ListViewItem} Chainability.
     */
    setTarget(i)
    {
        this.target = i;
        return this;
    }

    /**
     * Select this element (add the highlight class to the DOM)
     * @return {ListViewItem} Chainability.
     */
    select()
    {
        this.elem.addClass('selected');
        return this;
    }

    /**
     * Remove the highlight class from the DOM element
     * @return {ListViewItem} Chainability.
     */
    deselect()
    {
        this.elem.removeClass('selected');
        return this;
    }

    /**
     * Is the item selected?
     * @return {Boolean} Whether or not this item is selected
     */
    isSelected() { return this.elem.hasClass('selected'); }

    /**
     * Toggle display of file information
     * @return {ListViewItem} Chainability.
     */
    toggleSnippets()
    {
        this.snippets = !this.snippet;
        this.elem.find('.snippet').toggleClass('hidden');
        return this;
    }

    /**
     * Detach the DOM element
     * @return {ListViewItem} Chainability.
     */
    detach()
    {
        this.elem.detach();
        return this;
    }

    /**
     * Hide the DOM element
     * @return {ListViewItem} Chainability.
     */
    hide()
    {
        this.elem.addClass('hidden');
        return this;
    }

    /**
     * Show the DOM element
     * @return {ListViewItem} Chainability.
     */
    show()
    {
        this.elem.removeClass('hidden');
        return this;
    }

    /**
     * Is the item a directory?
     * @return {Boolean} True if the object represented is a directory.
     */
    isDirectory()    { return (this.fileObj.type == 'directory'); }

    /**
     * Is the item a file?
     * @return {Boolean} True if the object represented is a file.
     */
    isFile()         { return (this.fileObj.type == 'file'); }
}

module.exports = ListViewItem;
