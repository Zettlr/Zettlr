// Display a small notification in the top-right corner of the window

class ZettlrNotification
{
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

    moveUp(oldelemheight)
    {
        let newpos = parseInt(this.div.css('top')) - oldelemheight - 10;
        this.div.css('top', newpos + "px");
    }
}

module.exports = ZettlrNotification;
