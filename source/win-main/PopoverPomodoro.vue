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
        v-model="internalTaskDuration"
        v-bind:label="taskLabel"
        v-bind:min="1"
        v-bind:max="120"
      ></NumberControl>
      <NumberControl
        v-model="internalShortDuration"
        v-bind:label="shortLabel"
        v-bind:min="1"
        v-bind:max="120"
      ></NumberControl>
      <NumberControl
        v-model="internalLongDuration"
        v-bind:label="longLabel"
        v-bind:min="1"
        v-bind:max="120"
      ></NumberControl>
      <hr>
      <SelectControl
        v-model="internalEffect"
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
        v-bind:model-value="internalVolume"
        v-bind:label="volumeLabel"
        v-bind:min="0"
        v-bind:max="100"
        v-on:change="internalVolume = $event"
      ></SliderControl>
      <hr>
      <button v-on:click="startPomodoro">
        {{ startLabel }}
      </button>
    </template>
  </div>
</template>

<script lang="ts">
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

import NumberControl from '@common/vue/form/elements/Number.vue'
import SelectControl from '@common/vue/form/elements/Select.vue'
import SliderControl from '@common/vue/form/elements/Slider.vue'
import { trans } from '@common/i18n-renderer'
import { PropType } from 'vue'

export default {
  name: 'PopoverExport',
  components: {
    NumberControl,
    SelectControl,
    SliderControl
  },
  props: {
    taskDuration: {
      type: Number,
      default: 1500 / 60
    },
    shortDuration: {
      type: Number,
      default: 300 / 60
    },
    longDuration: {
      type: Number,
      default: 1200 / 60
    },
    currentPhase: {
      type: String,
      default: 'task'
    },
    elapsed: {
      type: Number,
      default: 0
    },
    isRunning: {
      type: Boolean,
      default: false
    },
    soundEffects: {
      type: Object as PropType<Record<string, string>>,
      default: () => { return {} }
    },
    effect: {
      type: String,
      default: ''
    },
    volume: {
      type: Number,
      default: 100
    }
  },
  data: function () {
    return {
      shouldBeRunning: this.isRunning,
      internalVolume: this.volume,
      internalEffect: this.effect,
      internalShortDuration: this.shortDuration,
      internalTaskDuration: this.taskDuration,
      internalLongDuration: this.longDuration,
      internalElapsed: this.elapsed,
      internalCurrentPhase: this.currentPhase
    }
  },
  computed: {
    popoverData: function () {
      return {
        taskDuration: this.internalTaskDuration * 60,
        shortDuration: this.internalShortDuration * 60,
        longDuration: this.internalLongDuration * 60,
        effect: this.internalEffect,
        volume: this.internalVolume / 100,
        shouldBeRunning: this.shouldBeRunning
      }
    },
    remainingTimeFormatted: function () {
      let timeRemaining = this.internalElapsed
      switch (this.currentPhase) {
        case 'task':
          timeRemaining = this.internalTaskDuration * 60 - this.internalElapsed
          break
        case 'short':
          timeRemaining = this.internalShortDuration * 60 - this.internalElapsed
          break
        case 'long':
          timeRemaining = this.internalLongDuration * 60 - this.internalElapsed
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
      if (this.internalCurrentPhase === 'task') {
        return this.taskLabel
      } else if (this.internalCurrentPhase === 'long') {
        return this.longLabel
      } else {
        return this.shortLabel
      }
    }
  },
  methods: {
    startPomodoro: function () {
      this.shouldBeRunning = true
    },
    stopPomodoro: function () {
      this.shouldBeRunning = false
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
