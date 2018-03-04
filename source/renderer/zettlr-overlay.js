/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrOverlay class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Well, this class exists because 8 seconds start up time is
 *                  just unbearable.
 *
 * END HEADER
 */

/**
 * This class only exists because Typo.js needs about eight seconds to
 * initizalize the German dictionary (and, probably, other huge dictionaries
 * as well, once they have been included).
 */
class ZettlrOverlay
{
    /**
     * Prepare the overlay
     * @param {ZettlrRenderer} parent The renderer
     */
    constructor(parent)
    {
        this.parent = parent;
        this.container = $('#container');
        this.modal = $('<div>').addClass('modal');
    }

    /**
     * Show the overlay with a given message.
     * @param  {String} message The message to be shown.
     * @return {ZettlrOverlay}         Chainability.
     */
    show(message)
    {
        this.modal.html(`<div class="dialog">
        <h1 id="msg" style="text-align:center">${message}</h1>
        <div class="sk-circle">
        <div class="sk-circle1 sk-child"></div>
        <div class="sk-circle2 sk-child"></div>
        <div class="sk-circle3 sk-child"></div>
        <div class="sk-circle4 sk-child"></div>
        <div class="sk-circle5 sk-child"></div>
        <div class="sk-circle6 sk-child"></div>
        <div class="sk-circle7 sk-child"></div>
        <div class="sk-circle8 sk-child"></div>
        <div class="sk-circle9 sk-child"></div>
        <div class="sk-circle10 sk-child"></div>
        <div class="sk-circle11 sk-child"></div>
        <div class="sk-circle12 sk-child"></div>
        </div>
        </div>`);
        $('body').append(this.modal);

        // Adjust the margins
        let dialog = this.modal.find('.dialog').first();
        let diaH = dialog.outerHeight();
        let winH = $(window).height();

        // The modal dialog is always smaller than the window.
        let margin = (winH-diaH) / 2;
        dialog.css('margin-top', margin + "px");
        dialog.css('margin-bottom', margin + "px");

        return this;
    }

    /**
     * Uddates the content of the overlay
     * @param  {String} newmsg The new message
     * @return {ZettlrOverlay}        Chainability.
     */
    update(newmsg)
    {
        if(this.modal.html() === '') {
            this.show('');
        }
        this.modal.find('#msg').text(newmsg);

        // Adjust the margins
        let dialog = this.modal.find('.dialog').first();
        let diaH = dialog.outerHeight();
        let winH = $(window).height();

        // The modal dialog is always smaller than the window.
        let margin = (winH-diaH) / 2;
        dialog.css('margin-top', margin + "px");
        dialog.css('margin-bottom', margin + "px");

        return this;
    }

    /**
     * Closes the overlay.
     * @return {ZettlrOverlay} Chainability.
     */
    close()
    {
        this.modal.detach();
        this.modal.html('');

        return this;
    }
}

module.exports = ZettlrOverlay;
