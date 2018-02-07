// Controls the pomodoro timer

class ZettlrPomodoro
{
    constructor(parent, container)
    {
        this.parent = parent;
        this.container = container;

        this.duration = {
            'task': 1500,
            'short': 300,
            'long': 1200
        };

        this.duration = {
            'task': 10,
            'short': 10,
            'long': 10
        };

        // Color variables from resources/less/variables.less
        this.colors = {
            'meter': 'rgba(100, 100, 100, 1)',
            'task': 'rgba(240,  87, 52, 1)',
            'short': 'rgba(247, 235, 159, 1)',
            'long': 'rgba(200, 240, 170, 1)'
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
        this.playSound = true; // Play a sound each time a phase ends?

        this.svg = $('#toolbar .button.pomodoro svg').first();
        this.progressMeter = $('.pomodoro-value');
        this.progressMeter.attr('stroke-dasharray', Math.PI * 14); // Preset with 100%

        // For playing optional sound effects
        this.sound = new window.Audio();
        this.sound.volume = 0.15;
        this.sound.src = `file://${__dirname}/assets/glass.ogg`;
    }

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

        // Start!
        this.parent.handleEvent(null, {
            'command': 'notify',
            'content': `Let's begin with a first working phase!`
        });
    }

    // This function progresses the meter every second
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

                // Display nice little notification
                this.parent.handleEvent(null, {
                    'command': 'notify',
                    'content': `You've done ${this.counter.task} tasks! Now pause.`
                });

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

                // Display nice little notification
                this.parent.handleEvent(null, {
                    'command': 'notify',
                    'content': `Your ${this.phase.type} break is over! Continue with a work phase.`
                });

                this.phase.type = 'task';
                this.phase.max = this.duration.task;
                this.progressMeter.attr('stroke', this.colors.task);
            }
            if(!this.isMuted()) {
                // Play a "finish" audio sound
                this.sound.currentTime = 0;
                this.sound.play();
            }
        }

        // Progress.
        // 2*pi*radius * (1-progress)
        var dashoffset = Math.PI * 14 * (1 - this.phase.cur/this.phase.max);

        this.progressMeter.attr('stroke-dashoffset', dashoffset);

        // Prepare next cycle
        this.phase.cur++;

        setTimeout(() => {this.progress();}, 1000);
    }

    stop()
    {
        // Reset everything
        this.running = false;
        // Reset timer to none
        this.progressMeter.attr('stroke-dashoffset', this.progressMeter.attr('stroke-dasharray'));

        // Display success notification
        this.parent.handleEvent(null, {
            'command': 'notify',
            'content': `You have completed ${this.counter.task} tasks and had ${this.counter.short} short and ${this.counter.long} long breaks!`
        });

        // Now reset counters
        this.counter = {
            'task': 0,
            'short': 0,
            'long': 0
        };
    }

    // Helper
    isRunning() { return this.running; }
    isMuted() { return !this.playSound; }
}

module.exports = ZettlrPomodoro;
