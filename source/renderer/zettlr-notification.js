/**
 * @ignore
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
 * This is one of the shortest classes in Zettlr, as it only displays small
 * notification badges in the upper right edge of the window to notify the user,
 * e.g, for remote changes on disk or such things.
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
        this._parent = parent;
        this._div = $('<div>').addClass('notify');
        this._div.html(message);
        $('body').append(this._div);

        let pos = this._div.outerHeight()+10;
        this._div.css('top', 10 + (position * pos) + "px");

        this._div.on('click', (e) => {
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
        this._div.animate({
            opacity: 0,
        }, 200, () => {
            // Complete -> remove
            let h = this._div.outerHeight();
            this._div.detach();
            this._parent.notifySplice(this, h);
        });
    }

    /**
     * Move up the notification by the height given
     * @param  {Integer} oldelemheight The amount this should go up.
     * @return {void}               Nothing to return.
     */
    moveUp(oldelemheight)
    {
        let newpos = parseInt(this._div.css('top')) - oldelemheight - 10;
        this._div.css('top', newpos + "px");
    }
}

module.exports = ZettlrNotification;
