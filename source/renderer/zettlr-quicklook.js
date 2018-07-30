/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrQuicklook class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a single Quicklook window
 *
 * END HEADER
 */

const fs = require('fs');
const path = require('path');

// CodeMirror related includes
// First codemirror addons
require('codemirror/addon/mode/overlay');
require('codemirror/addon/edit/continuelist');
require('./assets/codemirror/indentlist.js');
require('codemirror/addon/search/search');
require('codemirror/addon/search/searchcursor');
require('codemirror/addon/search/jump-to-line');
require('codemirror/addon/dialog/dialog.js');
require('codemirror/addon/edit/closebrackets');

// Modes
require('codemirror/mode/markdown/markdown');
require('codemirror/mode/gfm/gfm');
const CodeMirror = require('codemirror');

/**
 * Quicklook windows are small overlay windows based on pure CSS (so that they
 * behave correctly even in fullscreen mode, where it is difficult to display
 * native modal windows per OS). They are read-only CodeMirror instances that
 * can be resized, dragged around, minimized by a double-click on the title bar
 * and make use of the necessary CodeMirror functionality, such as Searching.
 */
class ZettlrQuicklook
{
    /**
     * Create a window
     * @param {ZettlrBody} parent   Calling object
     * @param {ZettlrFile} file     The file whose content should be displayed
     */
    constructor(parent, file)
    {
        this._body = parent;
        this._file = file;
        this._cm = null;
        this._window = null;
        this._bodyHeight = 0; // Contains the height of the element, in case it was minimized
        this._load();
        this.show();
    }

    /**
     * Load the Quicklook template and prepare everything
     */
    _load()
    {
        this._window = $(fs.readFileSync(path.join(__dirname, 'assets', 'tpl', 'quicklook.htm'), 'utf8'));

        this._cm = CodeMirror.fromTextArea(this._window.find('textarea')[0], {
            readOnly: true,
            mode: {
                name: 'gfm',
                highlightFormatting: true
            },
            lineWrapping: true,
            extraKeys: {
                'Cmd-F'         : 'findPersistent',
                'Ctrl-F'        : 'findPersistent'
            },
            theme: 'zettlr', // We don't actually use the cm-s-zettlr class, but this way we prevent the default theme from overriding.
            cursorBlinkRate: -1 // Hide the cursor
        });

        this._window.find('h1').first().text(this._file.name);
        this._cm.setValue(this._file.content);

        this._window.draggable({
            handle: 'div.title',
            containment: 'document',
            cursor: '-webkit-grabbing',
            stack: '.quicklook',
            stop: (e, ui) => {
                this._cm.focus();
            }
        });

        this._window.resizable({
            handles: 'e, se, s, sw, w',
            containment: 'document',
            minHeight: 400,
            minWidth: 400,
            resize: (e, ui) => {
                let bar = this._window.find('.title');
                this._window.find('.body').css('height', (ui.size.height-bar.outerHeight()) + 'px');
                this._cm.refresh();
            },
            stop: (e, ui) => {
                // Refresh the editor to account for changes in the size.
                this._cm.refresh();
                this._cm.focus();
            }
        });

        this._window.find('.close').first().on('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        this._window.find('.title').first().on('dblclick', (e) => {
            this.toggleWindow();
        });

        // Bring quicklook window to front on click on the title
        this._window.find('.title').first().on('click', (e) => {
            let max, group = $('.quicklook');

            if(group.length < 1) return;
            max = parseInt(group[0].style.zIndex, 10) || 0;
            $(group).each(function(i) {
                if(parseInt(this.style.zIndex, 10) > max) {
                    max = parseInt(this.style.zIndex, 10);
                }
            });

            this._window.css({'zIndex' : max+1});
        });
    }

    /**
     * Shows the quicklook window on screen.
     * @return {ZettlrQuicklook} Chainability.
     */
    show()
    {
        let height = $(window).height();
        let width = $(window).width();
        let qlh = height * 0.66; // Two thirds of screen
        let qlw = width * 0.5;

        // Take care of minimum sizes
        if(qlh < 400) {
            qlh = 400;
        }
        if(qlw < 400) {
            qlw = 400;
        }

        // Somehow the draggable() plugin thinks it's best to set the position
        // to relative, which then causes the second window to be positioned
        // NOT where it should but directly beneath the first QL-Window
        // (respectively its original place before it was moved).
        this._window.css('position', 'fixed');

        // Set dimensions and positions
        this._window.css('width', qlw);
        this._window.css('height', qlh);
        this._window.css('top', height/2 - qlh/2);
        this._window.css('left', width/2 - qlw/2);

        // Append (e.g., show) and set the body to a correct size and give the
        // CM a first refresh
        $('body').append(this._window);
        this._window.find('.body').css(
            'height',
            (qlh-this._window.find('.title').outerHeight()) + 'px'
        );
        this._cm.refresh();
        return this;
    }

    /**
     * Displays visibility of the window's body.
     * @return {ZettlrQuicklook} Chainability.
     */
    toggleWindow()
    {
        if(this._window.hasClass('minimize')) {
            // Restore
            this._window.removeClass('minimize');
            this._window.css('height', this._bodyHeight);
            let bar = this._window.find('.title');
            this._window.resizable('enable');
            this._window.find('.body').css(
                'height',
                (parseFloat(this._bodyHeight)-bar.outerHeight()) + 'px'
            );
            this._window.find('.CodeMirror').css('display', 'block');
            this._cm.refresh();
        } else {
            // Minimize
            this._window.addClass('minimize');
            this._bodyHeight = this._window.css('height');
            this._window.find('.body').css('height', '0px');
            this._window.resizable('disable');
            this._window.css('height', '');
            this._window.find('.CodeMirror').css('display', 'none');
        }

        return this;
    }

    /**
     * Closes the window and destroys it.
     * @return {void} Nothing to return.
     */
    close()
    {
        this._window.detach();
        this._cm = null;
        this._window = null;
        this._body.qlsplice(this); // Remove from ql-list in ZettlrBody
    }
}

module.exports = ZettlrQuicklook;
