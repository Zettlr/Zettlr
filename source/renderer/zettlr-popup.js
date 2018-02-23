/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrPopup class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Displays a popup to the target element.
 *                  ZettlrPopup features a class that can be instantiated to
 *                  pop up small tooltip style windows that can hold some
 *                  content. It can be used to offer small pieces of
 *                  configuration or simply hold text. They are modal, i.e. you
 *                  can't click something else -- a click anywhere in the
 *                  window is required to hide it first.
 *
 * END HEADER
 */

/**
 * ZettlrPopup class
 */
class ZettlrPopup
{
    /**
     * Display the popup
     * @param {Mixed} parent          The object that called this popup
     * @param {jQuery} elem            The DOM element to which the popup should bind itself.
     * @param {Mixed} content         The content of the popup (either jQuery or text)
     * @param {Function} [callback=null] A callback to be called when the popup is closed.
     */
    constructor(parent, elem, content, callback = null)
    {
        this.parent = parent;
        this.content = content; // Should contain a jQuery object
        this.callback = callback; // Function to be called on close
        this.elem = elem;

        // Where the small arrow should point to.
        this.x = 0;
        this.y = 0;

        this.modal = $('<div>').css('top', '0').css('left', '0').css('bottom', '0').css('right', '0').css('position', 'absolute');

        // Close the popup either on left or right mouse click
        this.modal.on('click', (e) => {
            this.close(true);
            // Simulate a click-through afterwards
            document.elementFromPoint(e.clientX, e.clientY).click();
        });
        this.modal.on('contextmenu', (e) => {
            this.close(true);
        });

        // Keep the popup relative to parent element even on resize
        $(window).on('resize', (e) => {
            this.place();
        });

        this.popup = $('<div>').addClass('popup').css('opacity', '0');
        this.arrow = $('<div>').addClass('popup-arrow');
        this.popup.append(this.content);
        $('body').append(this.modal);
        $('body').append(this.popup);
        $('body').append(this.arrow);

        // Activate forms
        this.popup.find('form').on('submit', (e) => {
            e.preventDefault();
            this.close();
        });

        // If there is a form, autoselect the content of its first input
        this.popup.find('input').first().select().focus();
        this.popup.find('input').on('keyup', (e) => {
            if(e.which == 27) {
                // ESC
                this.close(true);
            }
        });

        // Place
        this.place();

        // Afterwards blend it in
        this.popup.animate({'opacity': '1'}, 200, 'swing');
    }

    /**
     * Places the popup relative to the target element.
     * @return {void} Nothing to return.
     */
    place()
    {
        // TODO: Automatically choose one of the points depending on where there is enough space
        this.x = this.elem.offset().left + this.elem.outerWidth()/2;
        this.y = this.elem.offset().top + this.elem.outerHeight();

        let offsetY = this.popup.outerHeight() + this.y + 5; // 5px for arrow
        let offsetX = this.popup.outerWidth() + this.x + 5;
        let height = this.popup.outerHeight();
        let width = this.popup.outerWidth();

        // First find on which side there is the most space.
        let top    = this.elem.offset().top;
        let left   = this.elem.offset().left;
        let right  = window.innerWidth - left - this.elem.outerWidth();
        let bottom = window.innerHeight - top - this.elem.outerHeight();

        // 10px: arrow plus the safety-margin
        if(bottom > height + 10) {
            // Below element
            this.arrow.addClass('up');
            this.popup.css('top', (this.y + 5) + 'px');
            if(offsetX > window.innerWidth-5) {
                this.popup.css('left', (window.innerWidth - width - 5) + 'px'); // 5px margin to document
            } else {
                if(this.x - width/2 < 0) {
                    this.popup.css('left', '5px');
                } else {
                    this.popup.css('left', (this.x - width/2) + 'px');
                }
            }
            this.arrow.css('top', (top + this.elem.outerHeight()) + 'px');
            this.arrow.css('left', (left + (this.elem.outerWidth()/2)) + 'px');
        } else if(right > width + 10) {
            // We can place it right of the element
            // Therefore re-compute x and y
            this.x = this.elem.offset().left + this.elem.outerWidth();
            this.y = this.elem.offset().top + this.elem.outerHeight()/2;
            this.arrow.addClass('left');
            this.popup.css('left', (this.x + 5) + 'px');
            if(this.y + height/2 > window.innerHeight-5) {
                this.popup.css('top', (window.innerHeight - height - 5) + 'px');
            } else {
                this.popup.css('top', (this.y - height/2) + 'px');
            }
            this.arrow.css('left', (left + this.elem.outerWidth()) + 'px');
            this.arrow.css('top', top + (this.elem.outerHeight()/2) + 'px');
        } else {
            // Above
            // Therefore re-compute x and y
            this.x = this.elem.offset().left + this.elem.outerWidth()/2;
            this.y = this.elem.offset().top;
            this.arrow.addClass('down');
            this.popup.css('top', (this.y - height - 5) + 'px');
            if(this.x+width/2 > window.innerWidth - 5) {
                this.popup.css('left', (window.innerWidth - width - 5) + 'px');
            } else {
                this.popup.css('left', (this.x - width/2) + 'px');
            }
            this.arrow.css('top', top + 'px');
            this.arrow.css('left', (left+this.elem.outerWidth()/2) + 'px');
        }
    }

    /**
     * Closes the popup and calls the callback, if given
     * @param  {Boolean} [abort=false] Should we send the form if there is one?
     * @return {void}                Nothing to return.
     */
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

        this.arrow.detach();
        this.popup.animate({'opacity': '0'}, 200, 'swing', () => {
            this.popup.detach();
            this.modal.detach();
        });
    }
}

module.exports = ZettlrPopup;
