// Quicklook windows

const fs = require('fs');
const path = require('path');

class ZettlrQuicklook
{
    constructor(parent, file, darkTheme)
    {
        this.parent = parent;
        this.file = file;
        this.bodyHeight = 0; // Contains the height of the element, in case it was minimized
        this.load(file, darkTheme);
        this.show();
    }

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
            theme: (darkTheme) ? 'zettlr-dark' : 'zettlr',
            cursorBlinkRate: -1 // Hide the cursor
        });

        this.window.find('h1').first().text(file.name);
        this.cm.setValue(file.content);

        this.window.draggable({
            handle: 'div.title',
            containment: 'document',
            cursor: '-webkit-grabbing',
            stack: '.quicklook'
        });

        this.window.resizable({
            handles: 'e, se, s, sw, w',
            containment: 'document',
            minHeight: 400,
            minWidth: 400,
            resize: (e, ui) => {
                let bar = this.window.find('.title');
                this.window.find('.body').css('height', (ui.size.height-bar.outerHeight()) + 'px');
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

    show()
    {
        let height = $(window).height();
        let width = $(window).width();
        let qlh = height * 0.66; // Two thirds of screen
        let qlw = width * 0.5;

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
    }

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
        } else {
            // Minimize
            this.window.addClass('minimize');
            this.bodyHeight = this.window.css('height');
            this.window.find('.body').css('height', '0px');
            this.window.resizable('disable');
            this.window.css('height', '');
        }
    }

    toggleTheme()
    {
        if(this.cm.getOption('theme') === 'zettlr-dark') {
            this.cm.setOption('theme', 'zettlr');
        } else {
            this.cm.setOption('theme', 'zettlr-dark');
        }
    }

    close()
    {
        this.window.detach();
        this.cm = null;
        this.window = null;
        this.parent.qlsplice(this); // Remove from ql-list in ZettlrBody
    }
}

module.exports = ZettlrQuicklook;
