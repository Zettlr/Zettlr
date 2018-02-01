// Handles a single list view element in the preview

const { formatDate } = require('../common/zettlr-helpers.js');

class ListViewItem
{
    constructor(parent, fileobj, hidden = false)
    {
        this.parent = parent;
        this.fileObj = fileobj;
        this.hash = this.fileObj.hash; // Associate for ease
        this.hidden = hidden;
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
        if(hidden) {
            this.elem.find('.snippet').first().addClass('hidden');
        }

        // Attach to element and activate listeners
        this.parent.container.append(this.elem);
        this.act();
    }

    // Activate this element
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
    }

    moveToTarget()
    {
        if(this.elem.index() == this.target) {
            return;
        } else if(this.target == 0) {
            this.elem.insertBefore(this.parent.container.find('li')[0]);
        } else {
            this.elem.insertAfter(this.parent.container.find('li')[this.target-1]);
        }
    }

    update(nData)
    {
        if(this.fileObj.type == 'directory') {
            // Names are updated by unlinking only because they change the hash.
            return;
        }

        // Update if necessary
        if(nData.snippet != this.fileObj.snippet || this.fileObj.modtime != nData.modtime) {
            this.elem.find('.snippet').html(`${nData.snippet}<br><small>${formatDate(new Date(this.fileObj.modtime))}</small>`);
        }
    }

    getPos()         { return this.elem.index(); }
    getTarget()      { return this.target; }
    setTarget(i)     { this.target = i; }

    select()         { this.elem.addClass('selected'); }
    deselect()       { this.elem.removeClass('selected'); }
    isSelected()     { return this.elem.hasClass('selected'); }

    toggleSnippets() { this.elem.find('.snippet').toggleClass('hidden'); }

    detach()         { this.elem.detach(); }

    hide()           { this.elem.addClass('hidden'); }
    show()           { this.elem.removeClass('hidden'); }

    isDirectory()    { return (this.fileObj.type == 'directory'); }
    isFile()         { return (this.fileObj.type == 'file'); }
}

module.exports = ListViewItem;
