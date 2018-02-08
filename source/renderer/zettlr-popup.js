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
    constructor(parent, targetX, targetY)
    {
        this.parent = parent;

        // Where the small arrow should point to.
        this.x = targetX;
        this.y = targetY;

        this.popup = $('div'); // TODO
    }

    // Places the popup onto the window.
    place()
    {
        // First determine where we can put our popup by measuring height and
        // width of it and comparing it with the target position.
        //
        // Possible error scenario: A point closer than 20 pixels to an edge,
        // where it would be not nice to place the dialog. In this case, move
        // the target a little bit inwards. It's cheating, but who cares?

        if((this.x < 20 || this.x > (window.innerWidth-20))
        && (this.y < 20 || this.y > (window.innerHeight-20))) {
            // In this case (i.e. whoever ordered this popup to popup right in
            // a corner) simply give prevalence to x, because moving inwards is
            // always better.
            if(this.x < 20) {
                this.x = 20;
            } else {
                this.x = window.innerWidth - 20;
            }
        }

        // Now we can place it somewhere. Give prevalence to the coordinate that
        // is placed more inside. TODO
    }
}
