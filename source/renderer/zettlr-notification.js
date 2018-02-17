/**
 * BEGIN HEADER
 *
 * Contains:        ZettlrNotification class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Displays Operating Style system notifications
 *
 * END HEADER
 */

/**
 * ZettlrNotification class
 */
class ZettlrNotification
{
    /**
     * Show a new notification.
     * @param {ZettlrBody} parent   The Zettlr body object.
     * @param {String} message  The message that should be displayed
     * @param {Integer} position The position in the holding array.
     */
    constructor(parent, message, position)
    {
        this.parent = parent;
        this.div = $('<div>').addClass('notify');
        this.div.html(message);
        $('body').append(this.div);

        let pos = this.div.outerHeight()+10;
        this.div.css('top', 10 + (position * pos) + "px");

        this.div.on('click', (e) => {
            this.close();
        });

        setTimeout(() => {
            this.close();
        }, 3000);
    }

    /**
     * Close the notification
     * @return {void} Nothing to return.
     */
    close()
    {
        this.div.animate({
            opacity: 0,
        }, 200, () => {
            // Complete -> remove
            let h = this.div.outerHeight();
            this.div.detach();
            this.parent.notifySplice(this, h);
        });
    }

    /**
     * Move up the notification by the height given
     * @param  {Integer} oldelemheight The amount this should go up.
     * @return {void}               Nothing to return.
     */
    moveUp(oldelemheight)
    {
        let newpos = parseInt(this.div.css('top')) - oldelemheight - 10;
        this.div.css('top', newpos + "px");
    }
}

module.exports = ZettlrNotification;
