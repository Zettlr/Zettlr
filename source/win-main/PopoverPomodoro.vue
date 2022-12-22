<template>
  <div>
    <template v-if="isRunning">
      <!-- Display running time -->
      <p class="pomodoro-big">
        {{ remainingTimeFormatted }}
      </p>
      <p class="pomodoro-big">
        {{ currentPhaseLabel }}
      </p>
      <hr>
      <button v-on:click="stopPomodoro">
        {{ stopLabel }}
      </button>
    </template>
    <template v-else>
      <!-- Display set up -->
      <NumberControl
        v-model="taskDuration"
        v-bind:label="taskLabel"
        v-bind:min="1"
        v-bind:max="120"
      ></NumberControl>
      <NumberControl
        v-model="shortDuration"
        v-bind:label="shortLabel"
        v-bind:min="1"
        v-bind:max="120"
      ></NumberControl>
      <NumberControl
        v-model="longDuration"
        v-bind:label="longLabel"
        v-bind:min="1"
        v-bind:max="120"
      ></NumberControl>
      <hr>
      <SelectControl
        v-model="effect"
        v-bind:label="soundEffectsLabel"
        v-bind:options="soundEffects"
      ></SelectControl>
      <!--
        NOTE: In below's component we are not using model, since we only want to
        report a change after the user has released the mouse to avoid audio
        glitches. However, Vue doesn't support the "v-model.lazy" modifier on
        custom elements yet. See: https://github.com/vuejs/vue/issues/6914
      -->
      <SliderControl
        v-bind:model-value="volume"
        v-bind:label="volumeLabel"
        v-bind:min="0"
        v-bind:max="100"
        v-on:change="volume = $event"
      ></SliderControl>
      <hr>
      <button v-on:click="startPomodoro">
        {{ startLabel }}
      </button>
    </template>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Pomodoro Popover
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file controls the pomodoro timer popover.
 *
 * END HEADER
 */

import NumberControl from '@common/vue/form/elements/Number'
import SelectControl from '@common/vue/form/elements/Select'
import SliderControl from '@common/vue/form/elements/Slider'
import { trans } from '@common/i18n-renderer'

export default {
  name: 'PopoverExport',
  components: {
    NumberControl,
    SelectControl,
    SliderControl
  },
  data: function () {
    return {
      taskDuration: 1500 / 60,
      shortDuration: 300 / 60,
      longDuration: 1200 / 60,
      currentPhase: 'task',
      elapsed: 0,
      isRunning: false,
      soundEffects: {},
      effect: '',
      volume: 100
    }
  },
  computed: {
    popoverData: function () {
      return {
        taskDuration: this.taskDuration * 60,
        shortDuration: this.shortDuration * 60,
        longDuration: this.longDuration * 60,
        isRunning: this.isRunning,
        effect: this.effect,
        volume: this.volume / 100
      }
    },
    remainingTimeFormatted: function () {
      let timeRemaining = this.elapsed
      switch (this.currentPhase) {
        case 'task':
          timeRemaining = this.taskDuration * 60 - this.elapsed
          break
        case 'short':
          timeRemaining = this.shortDuration * 60 - this.elapsed
          break
        case 'long':
          timeRemaining = this.longDuration * 60 - this.elapsed
      }

      const minutes = Math.floor(timeRemaining / 60)
      const seconds = timeRemaining % 60
      const minStr = (minutes < 10) ? `0${minutes}` : String(minutes)
      const secStr = (seconds < 10) ? `0${seconds}` : String(seconds)
      return `${minStr}:${secStr}`
    },
    startLabel: function () {
      return trans('Start')
    },
    stopLabel: function () {
      return trans('Stop')
    },
    taskLabel: function () {
      return trans('Work')
    },
    shortLabel: function () {
      return trans('Short break')
    },
    longLabel: function () {
      return trans('Break')
    },
    soundEffectsLabel: function () {
      return trans('Sound Effect')
    },
    volumeLabel: function () {
      return trans('Volume')
    },
    currentPhaseLabel: function () {
      if (this.currentPhase === 'task') {
        return this.taskLabel
      } else if (this.currentPhase === 'long') {
        return this.longLabel
      } else {
        return this.shortLabel
      }
    }
  },
  methods: {
    startPomodoro: function () {
      this.isRunning = true
    },
    stopPomodoro: function () {
      this.isRunning = false
    }
  }
}
</script>

<style lang="less">
p.pomodoro-big {
  font-size: 200%;
  text-align: center;
  margin: 10px;
}
</style>
