/*
* ZettlrPopup features a class that can be instantiated to pop up small tooltip
* style windows that can hold some content. It can be used to offer small
* pieces of configuration or simply hold text. They are modal, i.e. you can't
* click something else -- a click anywhere in the window is required to hide
* it first.
*
* ZettlrPopup is currently used by the pomodoro timer and the export function.
*/

class ZettlrPopup
{
    constructor(parent, targetX, targetY, content, callback = null)
    {
        this.parent = parent;
        this.content = content; // Should contain a jQuery object
        this.callback = callback; // Function to be called on close

        // Where the small arrow should point to.
        this.x = targetX;
        this.y = targetY;

        this.modal = $('<div>').css('top', '0').css('left', '0').css('bottom', '0').css('right', '0').css('position', 'absolute');
        this.modal.on('click', (e) => {
            this.close(true);
        })
        this.popup = $('<div>').addClass('popup');
        this.arrow = $('<div>').addClass('arrow');
        this.popup.append(this.content).append(this.arrow);
        $('body').append(this.modal);
        $('body').append(this.popup);

        // Activate forms
        this.popup.find('form').on('submit', (e) => {
            e.preventDefault();
            this.close();
        });

        // Place
        this.place();
    }

    // Places the popup onto the window.
    place()
    {
        let offsetY = this.popup.outerHeight() + this.y + 20; // 20px for arrow
        let offsetX = this.popup.outerWidth() + this.x + 20;
        let height = this.popup.outerHeight();
        let width = this.popup.outerWidth();

        if(offsetY < window.innerHeight) {
            // Below element
            this.arrow.addClass('up').css('top', (-height-this.arrow.outerHeight()) + 'px');
            this.popup.css('top', (this.y + 20) + 'px');
            if(offsetX > window.innerWidth-5) {
                this.popup.css('left', (window.innerWidth - width - 5) + 'px'); // 5px margin to document
            } else {
                if(this.x - width/2 < 0) {
                    this.popup.css('left', '5px');
                } else {
                    this.popup.css('left', (this.x - width/2) + 'px');
                }
            }
            this.arrow.css('left', (this.x - this.popup.offset().left) + 'px');
        } else if(offsetX < window.innerWidth) {
            // We can place it right of the element
            this.arrow.addClass('left').css('left', (-this.arrow.outerHeight()) + 'px');
            this.popup.css('left', (this.x + 20) + 'px');
            if(this.y + height/2 > window.innerHeight-5) {
                this.popup.css('top', (window.innerHeight - height - 5) + 'px');
            } else {
                this.popup.css('top', (this.y - height/2) + 'px');
            }
            this.arrow.css('top', (this.y - this.popup.offset().top) + 'px');
        } else {
            // Above
            this.arrow.addClass('down').css('top', this.arrow.outerHeight() + 'px');
            this.popup.css('top', (this.y - height - 20) + 'px');
            if(this.x+width/2 > window.innerWidth - 5) {
                this.popup.css('left', (window.innerWidth - width - 5) + 'px');
            } else {
                this.popup.css('left', (this.x - width/2) + 'px');
            }
            this.arrow.css('left', (this.x - this.popup.offset().left) + 'px');
        }
    }

    close(abort = false)
    {
        let t = {};

        if(this.callback && t.toString.call(this.callback) === '[object Function]') {
            if(this.popup.find('form').length > 0 && !abort) {
                let f = this.popup.find('form').first().serializeArray();
                this.callback(f);
            } else {
                this.callback(null);
            }
        }

        this.popup.detach();
        this.modal.detach();
    }
}

module.exports = ZettlrPopup;
