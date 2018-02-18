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
 * ZettlrPomodoro class.
 */
class ZettlrPomodoro
{
    /**
     * Prepare the timer.
     * @param {ZettlrRenderer} parent    The renderer object
     */
    constructor(parent)
    {
        this.parent = parent;
        this.preferences = null;

        this.duration = {
            'task': 1500,
            'short': 300,
            'long': 1200
        };

        // Color variables from resources/less/variables.less
        this.colors = {
            'meter': 'rgba(100, 100, 100, 1)',
            'task': 'rgba(240,  87, 52, 1)',
            'short': 'rgba(197, 175,  32, 1)',
            'long': 'rgba( 90, 170,  80, 1)'
        };

        this.phase = {
            'maxSec': 0,
            'curSec': 0,
            'type': 'task'
        };

        this.counter = {
            'task': 0,
            'short': 0,
            'long': 0
        };

        this.running = false; // Is timer currently running?
        this.playSound = false; // Play a sound each time a phase ends?

        this.svg = $('#toolbar .button.pomodoro svg').first();
        this.progressMeter = $('.pomodoro-value');
        this.progressMeter.attr('stroke-dasharray', Math.PI * 14); // Preset with 100%

        // For playing optional sound effects
        this.sound = new window.Audio();
        this.sound.volume = 1;
        this.sound.src = `file://${__dirname}/assets/glass.ogg`;

        // Preferences popup
        this.form = $('<form>').prop('method', 'GET').prop('action', '#');
        this.form.html(
            `
            <input type="number" style="color:${this.colors.task}" value="${this.duration.task/60}" name="task" min="1" max="100" required>
            <input type="number" style="color:${this.colors.short}" value="${this.duration.short/60}" name="short" min="1" max="100" required>
            <input type="number" style="color:${this.colors.long}" value="${this.duration.long/60}" name="long" min="1" max="100" required>
            <input type="checkbox" name="mute" id="mute"><label for="mute">${trans('pomodoro.mute')}</label>
            <input type="range" name="volume" min="0" max="100" value="${this.sound.volume*100}">
            <input type="submit" value="${trans('pomodoro.start')}">
            `
        );
    }

    /**
     * Start the timer with the current settings and begin the timeouts.
     * @return {void} Nothing to return.
     */
    start()
    {
        // Start the timer
        this.running = true;
        this.phase.type = 'task';
        this.phase.cur = 0;
        this.phase.max = this.duration.task;
        this.progressMeter.attr('stroke', this.colors.task);

        // Commence
        setTimeout(() => {this.progress();}, 1000);
    }

    /**
     * This progresses the timer every second
     * @return {void} Nothing to return.
     */
    progress()
    {
        if(!this.isRunning()) {
            // Break out of the loop
            return;
        }

        // Check if phase is ending
        if(this.phase.cur == this.phase.max) {
            // Reset and start next
            this.phase.cur = 0;
            if(this.phase.type === 'task') {
                this.counter.task++;

                if((this.counter.task % 4) === 0) {
                    // Long break every four tasks
                    this.phase.type = 'long';
                    this.phase.max = this.duration.long;
                    this.progressMeter.attr('stroke', this.colors.long);
                } else {
                    // Short break
                    this.phase.type = 'short';
                    this.phase.max = this.duration.short;
                    this.progressMeter.attr('stroke', this.colors.short);
                }
            } else {
                // One of the pauses is over -> begin next task
                this.counter[this.phase.type] = this.counter[this.phase.type]+1;

                this.phase.type = 'task';
                this.phase.max = this.duration.task;
                this.progressMeter.attr('stroke', this.colors.task);
            }
            if(!this.isMuted()) {
                // Play a "finish" audio sound
                this.sound.currentTime = 0;
                this.sound.play();
            }
            $('#pomodoro-phase-type').text(trans('pomodoro.phase.'+this.phase.type));
        }

        // Progress.
        // 2*pi*radius * (1-progress)
        var dashoffset = Math.PI * 14 * (1 - this.phase.cur/this.phase.max);

        this.progressMeter.attr('stroke-dashoffset', dashoffset);

        let sec = ((this.phase.max-this.phase.cur)%60);
        if(sec < 10) {
            sec = '0' + sec;
        }
        $('#pomodoro-time-remaining').text(Math.floor((this.phase.max-this.phase.cur)/60) + ':' + sec);

        // Prepare next cycle
        this.phase.cur++;

        setTimeout(() => {this.progress();}, 1000);
    }

    /**
     * Stop the timer.
     * @return {void} Nothing to return.
     */
    stop()
    {
        // Reset everything
        this.running = false;
        // Reset timer to none
        this.progressMeter.attr('stroke-dashoffset', this.progressMeter.attr('stroke-dasharray'));

        // Now reset counters
        this.counter = {
            'task': 0,
            'short': 0,
            'long': 0
        };
    }

    /**
     * Display a popup with information on the status.
     * @return {void} Nothing to return.
     */
    popup()
    {
        // Display the small settings popup
        if(this.preferences == null) {

            if(!this.isRunning()) {
                this.preferences = new ZettlrPopup(this, $('.button.pomodoro'), this.form, (form) => {
                    // Callback
                    this.preferences = null;
                    if(!form) {
                        // User has aborted
                        return;
                    }
                    // 0 = task
                    // 1 = Short
                    // 2 = long
                    // 3 = mute OR volume
                    // 4 = volume if mute
                    this.duration.task = form[0].value * 60;
                    this.duration.short = form[1].value * 60;
                    this.duration.long = form[2].value * 60;
                    if(form[3].name == 'mute') {
                        this.unmute();
                        this.sound.volume = form[4].value / 100;
                    } else {
                        this.mute();
                        this.sound.volume = form[3].value / 100;
                    }
                    // Now start
                    this.start();
                });
            } else {
                // Display information and a stop button
                let sec = ((this.phase.max-this.phase.cur)%60);
                if(sec < 10) {
                    sec = '0' + sec;
                }
                let time = Math.floor((this.phase.max-this.phase.cur)/60) + ':' + sec;
                this.preferences = new ZettlrPopup(this, $('.button.pomodoro'), $('<div>').html(
                    `<p><span id="pomodoro-phase-type">${trans('pomodoro.phase.'+this.phase.type)}</span></p>
                    <p><span id="pomodoro-time-remaining">${time}</span></p>
                    <button id="pomodoro-stop-button">${trans('pomodoro.stop')}</button>`
                ), (form) => {
                    // Callback
                    this.preferences = null;
                });
                $('#pomodoro-stop-button').on('click', (e) => {
                    this.preferences.close();
                    this.preferences = null;
                    this.stop();
                });
            }
        } else {
            this.preferences.close();
            this.preferences = null;
        }
    }

    // Helper functions

    /**
     * Is the timer running?
     * @return {Boolean} True, if the timer is currently running.
     */
    isRunning() { return this.running; }

    /**
     * Is the timer currently muted, i.e. won't play the notification sound?
     * @return {Boolean} True, if the timer is silent.
     */
    isMuted()   { return !this.playSound; }

    /**
     * Mutes the timer.
     * @return {ZettlrPomodoro} Chainability.
     */
    mute()
    {
        this.playSound = false;
        return this;
    }

    /**
     * Unmutes the timer.
     * @return {ZettlrPomodoro} Chainability.
     */
    unmute()
    {
        this.playSound = true;
        return this;
    }
}

module.exports = ZettlrPomodoro;
