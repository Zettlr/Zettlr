/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrPomodoro class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class controls the pomodoro timer.
 *
 * END HEADER
 */

const { trans } = require('../common/lang/i18n.js')

/**
 * This class is pretty straight-forward: It handles clicks on the pomodoro button,
 * updates its circle and handles the pomodoro timer functionality. It can start
 * and stop the timer and display a context-sensitive popup that either shows
 * controls for the timer _or_ the current status of it.
 */
class ZettlrPomodoro {
  /**
   * Prepare the timer.
   * @param {ZettlrRenderer} parent    The renderer object
   */
  constructor (parent) {
    this._renderer = parent
    this._pref = null

    // Default durations for all tasks (will be used on program start)
    this._duration = {
      'task': 1500,
      'short': 300,
      'long': 1200
    }

    // Info about the current phase
    this._phase = {
      'max': 0, // Overall time for current task
      'cur': 0, // Current elapsed time
      'type': 'task'
    }

    // Counts elapsed phases during one run (is reset on stop)
    this._counter = {
      'task': 0,
      'short': 0,
      'long': 0
    }

    this._running = false // Is timer currently running?

    this._svg = $('#toolbar .button.pomodoro svg').first()
    this._progressMeter = $('.pomodoro-value')
    this._progressValue = this._svg.find('.pomodoro-value').first()

    // For playing optional sound effects
    this._sound = new window.Audio()
    this._sound.volume = 1
    this._sound.src = require('./assets/glass.ogg')
  } // END constructor

  /**
   * Returns the popup target
   *
   * @return  {Element}  The toolbar button
   */
  get popupTarget () {
    return document.querySelector('.button.pomodoro')
  }

  /**
   * Start the timer with the current settings and begin the timeouts.
   * @return {void} Nothing to return.
   */
  _start () {
    // Start the timer
    this._running = true
    this._phase.type = 'task'
    this._phase.cur = 0
    this._phase.max = this._duration.task
    this._progressValue.addClass('task')

    // Commence
    setTimeout(() => { this._progress() }, 1000)
  }

  /**
   * This progresses the timer every second
   * @return {void} Nothing to return.
   */
  _progress () {
    if (!this.isRunning()) {
      // Break out of the loop
      return
    }

    // Check if phase is ending
    if (this._phase.cur === this._phase.max) {
      // Remove phase classes
      this._progressValue.removeClass('long short task')
      // Reset and start next
      this._phase.cur = 0
      if (this._phase.type === 'task') {
        global.ipc.send('add-pomodoro') // Increase the global pomodoro count
        this._counter.task++

        if ((this._counter.task % 4) === 0) {
          // Long break every four tasks
          this._phase.type = 'long'
          this._phase.max = this._duration.long
        } else {
          // Short break
          this._phase.type = 'short'
          this._phase.max = this._duration.short
        }
      } else {
        // One of the pauses is over -> begin next task
        this._counter[this._phase.type] = this._counter[this._phase.type] + 1

        this._phase.type = 'task'
        this._phase.max = this._duration.task
      }
      if (this._sound.volume > 0) {
        // Play a "finish" audio sound
        this._sound.currentTime = 0
        this._sound.play()
      }

      // Set the class of the value accordingly
      this._progressValue.addClass(this._phase.type)
      const pomodoroTimerPhaseElement = document.getElementById('pomodoro-phase-type')
      if (pomodoroTimerPhaseElement) {
        pomodoroTimerPhaseElement.textContent = trans('pomodoro.phase.' + this._phase.type)
      }

      global.notify('Pomodoro: <strong>' + trans('pomodoro.phase.' + this._phase.type) + '</strong>')
    }

    // Visualise the progress using the Pomodoro circle.
    let progress = this._phase.cur / this._phase.max
    let large = (progress > 0.5) ? 1 : 0
    let x = Math.cos(2 * Math.PI * progress)
    let y = Math.sin(2 * Math.PI * progress)
    this._progressValue.attr('d', `M 1 0 A 1 1 0 ${large} 1 ${x} ${y} L 0 0`)

    let sec = ((this._phase.max - this._phase.cur) % 60)
    if (sec < 10) sec = '0' + sec

    const timeRemainingElement = document.getElementById('pomodoro-time-remaining')
    if (timeRemainingElement) {
      timeRemainingElement.textContent = Math.floor((this._phase.max - this._phase.cur) / 60) + ':' + sec
    }

    // Prepare next cycle
    this._phase.cur++

    // Lastly, indicate a possible change in the popup's size.
    if (this._pref !== null) {
      this._pref.change()
    }

    setTimeout(() => { this._progress() }, 1000)
  }

  /**
   * Stop the timer.
   * @return {void} Nothing to return.
   */
  _stop () {
    // Reset everything
    this._running = false
    // Reset timer to none
    this._progressValue.attr('d', '')
    this._progressValue.removeClass('long short task')

    // Now reset counters
    this._counter = {
      'task': 0,
      'short': 0,
      'long': 0
    }
  }

  /**
   * Display a popup with information on the status.
   * @return {void} Nothing to return.
   */
  popup () {
    // Display the small settings popup
    if (!this.isRunning()) {
      // Preferences popup
      let data = {
        'duration_task': this._duration.task / 60,
        'duration_short': this._duration.short / 60,
        'duration_long': this._duration.long / 60,
        'volume': this._sound.volume * 100
      }

      this._pref = global.popupProvider.show('pomodoro-settings', this.popupTarget, data, (form) => {
        this._pref = null
        // User has aborted
        if (form === null) return

        // 0 = task
        // 1 = short
        // 2 = long
        // 3 = volume
        this._duration.task = parseInt(form[0].value, 10) * 60
        this._duration.short = parseInt(form[1].value, 10) * 60
        this._duration.long = parseInt(form[2].value, 10) * 60
        this._sound.volume = parseInt(form[3].value, 10) / 100
        // Now start
        this._start()
      })

      const volumeDisplay = document.getElementById('pomodoro-volume-level')
      const volumeSlider = document.getElementById('pomodoro-volume-range')
      const volumeLevel = () => volumeSlider.value
      // Play the sound immediately as a check for the user
      volumeSlider.addEventListener('change', (evt) => {
        this._sound.volume = parseInt(volumeLevel(), 10) / 100
        this._sound.currentTime = 0
        this._sound.play()
      })

      // Indicate the correct volume immediately.
      // "onChange" triggers when the mouse is released,
      // "onInput" as soon as the bar moves.
      volumeSlider.addEventListener('input', (evt) => {
        volumeDisplay.textContent = `${volumeLevel()} %`
      })
    } else {
      // Display information and a stop button
      let sec = ((this._phase.max - this._phase.cur) % 60)
      if (sec < 10) {
        sec = '0' + sec
      }
      let data = {
        'time': Math.floor((this._phase.max - this._phase.cur) / 60) + ':' + sec,
        'type': trans('pomodoro.phase.' + this._phase.type)
      }

      this._pref = global.popupProvider.show('pomodoro-status', this.popupTarget, data, (form) => {
        this._pref = null
      })

      $('#pomodoro-stop-button').on('click', (e) => {
        global.popupProvider.close()
        this._pref = null
        this._stop()
      })
    }
  }

  // Helper functions

  /**
   * Is the timer running?
   * @return {Boolean} True, if the timer is currently running.
   */
  isRunning () { return this._running }
}

module.exports = ZettlrPomodoro
