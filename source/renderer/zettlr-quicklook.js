/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrQuicklook class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
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
require('codemirror/addon/edit/indentlist');
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
 * ZettlrQuicklook class
 */
class ZettlrQuicklook
{
    /**
     * Create a window
     * @param {ZettlrBody} parent    Calling object
     * @param {ZettlrFile} file      The file whose content should be displayed
     * @param {Boolean} darkTheme Dark theme?
     */
    constructor(parent, file, darkTheme)
    {
        this.parent = parent;
        this.file = file;
        this.bodyHeight = 0; // Contains the height of the element, in case it was minimized
        this.load(file, darkTheme);
        this.show();
    }

    /**
     * Load the Quicklook template and prepare everything
     * @param  {ZettlrFile} file      The file whose content should be displayed.
     * @param  {Boolean} darkTheme Dark Theme?
     * @return {void}           Nothing to return.
     */
    load(file, darkTheme)
    {
        this.window = $(fs.readFileSync(path.join(__dirname, 'assets', 'tpl', 'quicklook.htm'), 'utf8'));

        this.cm = CodeMirror.fromTextArea(this.window.find('textarea')[0], {
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
            theme: (darkTheme) ? 'zettlr-dark' : 'zettlr',
            cursorBlinkRate: -1 // Hide the cursor
        });

        this.window.find('h1').first().text(file.name);
        this.cm.setValue(file.content);

        this.window.draggable({
            handle: 'div.title',
            containment: 'document',
            cursor: '-webkit-grabbing',
            stack: '.quicklook',
            stop: (e, ui) => {
                this.cm.focus();
            }
        });

        this.window.resizable({
            handles: 'e, se, s, sw, w',
            containment: 'document',
            minHeight: 400,
            minWidth: 400,
            resize: (e, ui) => {
                let bar = this.window.find('.title');
                this.window.find('.body').css('height', (ui.size.height-bar.outerHeight()) + 'px');
                this.cm.refresh();
            },
            stop: (e, ui) => {
                // Refresh the editor to account for changes in the size.
                this.cm.refresh();
                this.cm.focus();
            }
        });

        this.window.find('.close').first().on('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        this.window.find('.title').first().on('dblclick', (e) => {
            this.toggleWindow();
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
        this.window.css('position', 'fixed');

        // Set dimensions and positions
        this.window.css('width', qlw);
        this.window.css('height', qlh);
        this.window.css('top', height/2 - qlh/2);
        this.window.css('left', width/2 - qlw/2);

        // Append (e.g., show) and set the body to a correct size and give the
        // CM a first refresh
        $('body').append(this.window);
        this.window.find('.body').css(
            'height',
            (qlh-this.window.find('.title').outerHeight()) + 'px'
        );
        this.cm.refresh();
        return this;
    }

    /**
     * Displays visibility of the window's body.
     * @return {ZettlrQuicklook} Chainability.
     */
    toggleWindow()
    {
        if(this.window.hasClass('minimize')) {
            // Restore
            this.window.removeClass('minimize');
            this.window.css('height', this.bodyHeight);
            let bar = this.window.find('.title');
            this.window.resizable('enable');
            this.window.find('.body').css(
                'height',
                (parseFloat(this.bodyHeight)-bar.outerHeight()) + 'px'
            );
            this.window.find('.CodeMirror').css('display', 'block');
            this.cm.refresh();
        } else {
            // Minimize
            this.window.addClass('minimize');
            this.bodyHeight = this.window.css('height');
            this.window.find('.body').css('height', '0px');
            this.window.resizable('disable');
            this.window.css('height', '');
            this.window.find('.CodeMirror').css('display', 'none');
        }

        return this;
    }

    /**
     * Toggles the theme of the quicklook window.
     * @return {ZettlrQuicklook} Chainability.
     */
    toggleTheme()
    {
        if(this.cm.getOption('theme') === 'zettlr-dark') {
            this.cm.setOption('theme', 'zettlr');
        } else {
            this.cm.setOption('theme', 'zettlr-dark');
        }
        return this;
    }

    /**
     * Closes the window and destroys it.
     * @return {void} Nothing to return.
     */
    close()
    {
        this.window.detach();
        this.cm = null;
        this.window = null;
        this.parent.qlsplice(this); // Remove from ql-list in ZettlrBody
    }
}

module.exports = ZettlrQuicklook;
