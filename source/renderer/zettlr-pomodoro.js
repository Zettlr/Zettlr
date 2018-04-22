/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrPomodoro class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This class controls the pomodoro timer.
 *
 * END HEADER
 */

const ZettlrPopup = require('./zettlr-popup.js');

const {trans} = require('../common/lang/i18n.js');

/**
 * This class is pretty straight-forward: It handles clicks on the pomodoro button,
 * updates its circle and handles the pomodoro timer functionality. It can start
 * and stop the timer and display a context-sensitive popup that either shows
 * controls for the timer _or_ the current status of it.
 */
class ZettlrPomodoro
{
    /**
     * Prepare the timer.
     * @param {ZettlrRenderer} parent    The renderer object
     */
    constructor(parent)
    {
        this._renderer = parent;
        this._pref = null;

        // Default durations for all tasks (will be used on program start)
        this._duration = {
            'task': 1500,
            'short': 300,
            'long': 1200
        };

        // Color variables from resources/less/variables.less
        this._colors = {
            'meter': 'rgba(100, 100, 100, 1)',
            'task': 'rgba(240,  87, 52, 1)',
            'short': 'rgba(197, 175,  32, 1)',
            'long': 'rgba( 90, 170,  80, 1)'
        };

        // Info about the current phase
        this._phase = {
            'max'  : 0, // Overall time for current task
            'cur'  : 0, // Current elapsed time
            'type' : 'task'
        };

        // Counts elapsed phases during one run (is reset on stop)
        this._counter = {
            'task': 0,
            'short': 0,
            'long': 0
        };

        this._running = false; // Is timer currently running?
        this._playSound = false; // Play a sound each time a phase ends?

        this._svg = $('#toolbar .button.pomodoro svg').first();
        this._progressMeter = $('.pomodoro-value');
        this._progressMeter.attr('stroke-dasharray', Math.PI * 14); // Preset with 100%

        // For playing optional sound effects
        this._sound = new window.Audio();
        this._sound.volume = 1;
        this._sound.src = `file://${__dirname}/assets/glass.ogg`;

        // Preferences popup
        this._form = $('<form>').prop('method', 'GET').prop('action', '#');
        this._form.html(
            `
            <input type="number" style="color:${this._colors.task}" value="${this._duration.task/60}" name="task" min="1" max="100" required>
            <input type="number" style="color:${this._colors.short}" value="${this._duration.short/60}" name="short" min="1" max="100" required>
            <input type="number" style="color:${this._colors.long}" value="${this._duration.long/60}" name="long" min="1" max="100" required>
            <input type="checkbox" name="mute" id="mute"><label for="mute">${trans('pomodoro.mute')}</label>
            <input type="range" name="volume" min="0" max="100" value="${this._sound.volume*100}">
            <input type="submit" value="${trans('pomodoro.start')}">
            `
        );
    }

    /**
     * Start the timer with the current settings and begin the timeouts.
     * @return {void} Nothing to return.
     */
    _start()
    {
        // Start the timer
        this._running = true;
        this._phase.type = 'task';
        this._phase.cur = 0;
        this._phase.max = this._duration.task;
        this._progressMeter.attr('stroke', this._colors.task);

        // Commence
        setTimeout(() => {this._progress();}, 1000);
    }

    /**
     * This progresses the timer every second
     * @return {void} Nothing to return.
     */
    _progress()
    {
        if(!this.isRunning()) {
            // Break out of the loop
            return;
        }

        // Check if phase is ending
        if(this._phase.cur == this._phase.max) {
            // Reset and start next
            this._phase.cur = 0;
            if(this._phase.type === 'task') {
                this._counter.task++;

                if((this._counter.task % 4) === 0) {
                    // Long break every four tasks
                    this._phase.type = 'long';
                    this._phase.max = this._duration.long;
                    this._progressMeter.attr('stroke', this._colors.long);
                } else {
                    // Short break
                    this._phase.type = 'short';
                    this._phase.max = this._duration.short;
                    this._progressMeter.attr('stroke', this._colors.short);
                }
            } else {
                // One of the pauses is over -> begin next task
                this._counter[this._phase.type] = this._counter[this._phase.type]+1;

                this._phase.type = 'task';
                this._phase.max = this._duration.task;
                this._progressMeter.attr('stroke', this._colors.task);
            }
            if(!this.isMuted()) {
                // Play a "finish" audio sound
                this._sound.currentTime = 0;
                this._sound.play();
            }
            $('#pomodoro-phase-type').text(trans('pomodoro.phase.'+this._phase.type));
        }

        // Progress.
        // 2*pi*radius * (1-progress)
        let dashoffset = Math.PI * 14 * (1 - this._phase.cur/this._phase.max);

        this._progressMeter.attr('stroke-dashoffset', dashoffset);

        let sec = ((this._phase.max-this._phase.cur)%60);
        if(sec < 10) {
            sec = '0' + sec;
        }
        $('#pomodoro-time-remaining').text(Math.floor((this._phase.max-this._phase.cur)/60) + ':' + sec);

        // Prepare next cycle
        this._phase.cur++;

        setTimeout(() => {this._progress();}, 1000);
    }

    /**
     * Stop the timer.
     * @return {void} Nothing to return.
     */
    _stop()
    {
        // Reset everything
        this._running = false;
        // Reset timer to none
        this._progressMeter.attr('stroke-dashoffset', this._progressMeter.attr('stroke-dasharray'));

        // Now reset counters
        this._counter = {
            'task'  : 0,
            'short' : 0,
            'long'  : 0
        };
    }

    /**
     * Display a popup with information on the status.
     * @return {void} Nothing to return.
     */
    popup()
    {
        // Display the small settings popup
        if(this._pref == null) {

            if(!this.isRunning()) {
                this._pref = new ZettlrPopup(this, $('.button.pomodoro'), this._form, (form) => {
                    // Callback
                    this._pref = null;
                    if(!form) {
                        // User has aborted
                        return;
                    }
                    // 0 = task
                    // 1 = Short
                    // 2 = long
                    // 3 = mute OR volume
                    // 4 = volume if mute
                    this._duration.task  = form[0].value * 60;
                    this._duration.short = form[1].value * 60;
                    this._duration.long  = form[2].value * 60;
                    if(form[3].name == 'mute') {
                        this.unmute();
                        this._sound.volume = form[4].value / 100;
                    } else {
                        this.mute();
                        this._sound.volume = form[3].value / 100;
                    }
                    // Now start
                    this._start();
                });
            } else {
                // Display information and a stop button
                let sec = ((this._phase.max-this._phase.cur)%60);
                if(sec < 10) {
                    sec = '0' + sec;
                }
                let time = Math.floor((this._phase.max-this._phase.cur)/60) + ':' + sec;
                this._pref = new ZettlrPopup(this, $('.button.pomodoro'), $('<div>').html(
                    `<p><span id="pomodoro-phase-type">${trans('pomodoro.phase.'+this._phase.type)}</span></p>
                    <p><span id="pomodoro-time-remaining">${time}</span></p>
                    <button id="pomodoro-stop-button">${trans('pomodoro.stop')}</button>`
                ), (form) => {
                    // Callback
                    this._pref = null;
                });
                $('#pomodoro-stop-button').on('click', (e) => {
                    this._pref.close();
                    this._pref = null;
                    this._stop();
                });
            }
        } else {
            this._pref.close();
            this._pref = null;
        }
    }

    // Helper functions

    /**
     * Is the timer running?
     * @return {Boolean} True, if the timer is currently running.
     */
    isRunning() { return this._running; }

    /**
     * Is the timer currently muted, i.e. won't play the notification sound?
     * @return {Boolean} True, if the timer is silent.
     */
    isMuted()   { return !this._playSound; }

    /**
     * Mutes the timer.
     * @return {ZettlrPomodoro} Chainability.
     */
    mute()
    {
        this._playSound = false;
        return this;
    }

    /**
     * Unmutes the timer.
     * @return {ZettlrPomodoro} Chainability.
     */
    unmute()
    {
        this._playSound = true;
        return this;
    }
}

module.exports = ZettlrPomodoro;
