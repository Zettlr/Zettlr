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
        this._listview = parent;
        this._fileObj = fileobj;
        this._hash = this._fileObj.hash; // Associate for ease
        this._snippets = snippets;
        this._target = -1;
        // Create the element
        this._elem = $('<li>')
        .addClass(this._fileObj.type)
        .attr('data-hash', this._fileObj.hash)
        .attr('title', this._fileObj.name);

        // Populate
        if(this._fileObj.type == 'directory') {
            this._elem.html(this._fileObj.name);
        } else if (this._fileObj.type == 'file') {
            this._elem.append(
                $('<strong>').text(
                    this._fileObj.name.substr(0, this._fileObj.name.lastIndexOf('.'))
                )
            );
            this._elem.append($('<br>'));
            this._elem.append(
                $('<span>').addClass('snippet')
                .text(this._fileObj.snippet)
                .append($('<br>'))
                .append(
                    $('<small>').text(formatDate(new Date(this._fileObj.modtime)))
                )
            );
        }

        // Add class if necessary
        if(!this._snippets) {
            this._elem.find('.snippet').first().addClass('hidden');
        }

        // Attach to element and activate listeners
        this._listview.getContainer().append(this._elem);
        this._act();
    }

    /**
     * Activate the element
     * @return {ListViewItem} Chainability.
     */
    _act()
    {
        // Only activate files
        if(this._fileObj.type == 'directory') {
            return;
        }

        this._elem.on('click', () => {
            if(this.isSelected()) {
                return;
            }

            this._listview.requestFile(this);
        });

        this._elem.draggable({
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
        if(this._elem.index() == this._target) {
            return this;
        } else if(this._target == 0) {
            this._elem.insertBefore(this._listview.getContainer().find('li')[0]);
        } else {
            this._elem.insertAfter(this._listview.getContainer().find('li')[this._target-1]);
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
        if(this._fileObj.type == 'directory') {
            // Names are updated by unlinking only because they change the hash.
            return this;
        }

        // Update if necessary
        if(this._fileObj.modtime != nData.modtime) {
            this._fileObj = nData;
            this._hash = this._fileObj.hash;
            this._elem.attr('data-hash', this._fileObj.hash)
            .attr('title', this._fileObj.name);
            this._elem.find('.snippet').html(`${nData.snippet}<br><small>${formatDate(new Date(nData.modtime))}</small>`);
        }

        return this;
    }

    /**
     * Get the actual index of the DOM element
     * @return {Integer} The DOM element's index
     */
    getPos()         { return this._elem.index(); }

    /**
     * Get the correct index for the DOM element
     * @return {Integer} The target position of the DOM element
     */
    getTarget()      { return this._target; }

    /**
     * Returns the list element
     * @return {jQuery} The DOM element of this item
     */
    getElem() { return this._elem; }

    /**
     * Returns the hash of the file to retrieve
     * @return {Integer} The hash
     */
    getHash() { return this._hash; }

    /**
     * Set the target of this item's DOM element
     * @param {Integer} i Zero-based target index
     * @return {ListViewItem} Chainability.
     */
    setTarget(i)
    {
        this._target = i;
        return this;
    }

    /**
     * Select this element (add the highlight class to the DOM)
     * @return {ListViewItem} Chainability.
     */
    select()
    {
        this._elem.addClass('selected');
        return this;
    }

    /**
     * Remove the highlight class from the DOM element
     * @return {ListViewItem} Chainability.
     */
    deselect()
    {
        this._elem.removeClass('selected');
        return this;
    }

    /**
     * Is the item selected?
     * @return {Boolean} Whether or not this item is selected
     */
    isSelected() { return this._elem.hasClass('selected'); }

    /**
     * Toggle display of file information
     * @return {ListViewItem} Chainability.
     */
    toggleSnippets()
    {
        this._snippets = !this._snippets;
        this._elem.find('.snippet').toggleClass('hidden');
        return this;
    }

    /**
     * Detach the DOM element
     * @return {ListViewItem} Chainability.
     */
    detach()
    {
        this._elem.detach();
        return this;
    }

    /**
     * Hide the DOM element
     * @return {ListViewItem} Chainability.
     */
    hide()
    {
        this._elem.addClass('hidden');
        return this;
    }

    /**
     * Show the DOM element
     * @return {ListViewItem} Chainability.
     */
    show()
    {
        this._elem.removeClass('hidden');
        return this;
    }

    /**
     * Trigger a click event on the element
     * @return {ListViewItem} This for chainability.
     */
    click()
    {
        this._elem.click();
        return this;
    }

    /**
     * Is the item a directory?
     * @return {Boolean} True if the object represented is a directory.
     */
    isDirectory()    { return (this._fileObj.type === 'directory'); }

    /**
     * Is the item a file?
     * @return {Boolean} True if the object represented is a file.
     */
    isFile()         { return (this._fileObj.type === 'file'); }
}

module.exports = ListViewItem;
