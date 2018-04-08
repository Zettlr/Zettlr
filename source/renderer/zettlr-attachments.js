/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrAttachments class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Displays the attachments of the current directory.
 *
 * END HEADER
 */

const {trans} = require('../common/lang/i18n.js');

class ZettlrAttachments
{
    constructor(parent)
    {
        this._renderer = parent;
        this._container = $('<div>').prop('id', 'attachments');
        $('body').append(this._container);
        this._open = false;
        this._attachments = [];
    }

    toggle()
    {
        // Toggles the display of the attachment pane
        if(!this._open) {
            this._container.animate({'right': '0%'});
        } else {
            this._container.animate({'right': '-20%'});
        }

        this._open = !this._open;
    }

    refresh()
    {
        this._container.html(`<h1>${trans('gui.attachments')}</h1>`);
        // Grab the newest attachments and refresh
        if(!this._renderer.getCurrentDir()) {
            this._container.append($('<p>').text(trans('gui.no_attachments')));
            return;
        }

        if(this._renderer.getCurrentDir().attachments.length == 0) {
            this._container.append($('<p>').text(trans('gui.no_attachments')));
            return;
        }

        this._attachments = this._renderer.getCurrentDir().attachments;

        for(let a of this._attachments) {
            this._container.append($('<a>').text(a.name).attr('href', '#').attr('data-hash', a.hash));
        }

        this._act();
    }

    _act()
    {
        $('#attachments a').click((e) => {
            let elem = $(e.target);
            for(let a of this._attachments) {
                if(a.hash == elem.attr('data-hash')) {
                    require('electron').shell.openItem(a.path);
                    break;
                }
            }
        });
    }
}

module.exports = ZettlrAttachments;
