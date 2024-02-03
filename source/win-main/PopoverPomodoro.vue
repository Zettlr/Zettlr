<template>
  <PopoverWrapper v-bind:target="target" v-on:close="$emit('close')">
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
        v-bind:options="optionizedEffects"
      ></SelectControl>
      <!--
        NOTE: In below's component we are not using model, since we only want to
        report a change after the user has released the mouse to avoid audio
        glitches. However, Vue doesn't support the "v-model.lazy" modifier on
        custom elements yet. See: https://github.com/vuejs/vue/issues/6914
      -->
      <SliderControl
        v-model="internalVolume"
        v-bind:label="volumeLabel"
        v-bind:min="0"
        v-bind:max="100"
      ></SliderControl>
      <hr>
      <button v-on:click="startPomodoro">
        {{ startLabel }}
      </button>
    </template>
  </PopoverWrapper>
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

import NumberControl from '@common/vue/form/elements/NumberControl.vue'
import SelectControl from '@common/vue/form/elements/SelectControl.vue'
import SliderControl from '@common/vue/form/elements/SliderControl.vue'
import PopoverWrapper from './PopoverWrapper.vue'
import { trans } from '@common/i18n-renderer'
import { type PropType } from 'vue'
import type { PomodoroConfig } from './App.vue'

export default {
  name: 'PopoverExport',
  components: {
    NumberControl,
    SelectControl,
    SliderControl,
    PopoverWrapper
  },
  props: {
    target: {
      type: HTMLElement,
      required: true
    },
    pomodoro: {
      type: Object as PropType<PomodoroConfig>,
      required: true
    },
    soundEffects: {
      type: Object as PropType<Array<{ label: string, file: string }>>,
      required: true
    }
  },
  emits: [ 'close', 'start', 'stop', 'config' ],
  data: function () {
    return {
      internalVolume: this.pomodoro.soundEffect.volume * 100,
      internalEffect: this.pomodoro.currentEffectFile,
      internalShortDuration: this.pomodoro.durations.short / 60,
      internalTaskDuration: this.pomodoro.durations.task / 60,
      internalLongDuration: this.pomodoro.durations.long / 60
    }
  },
  computed: {
    optionizedEffects () {
      const opt: Record<string, string> = {}
      for (const effect of this.soundEffects) {
        opt[effect.file] = effect.label
      }
      return opt
    },
    isRunning () {
      return this.pomodoro.intervalHandle !== undefined
    },
    remainingTimeFormatted: function () {
      const currentDuration = this.pomodoro.durations[this.pomodoro.phase.type]
      const timeRemaining = currentDuration - this.pomodoro.phase.elapsed
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
      if (this.pomodoro.phase.type === 'task') {
        return this.taskLabel
      } else if (this.pomodoro.phase.type === 'long') {
        return this.longLabel
      } else {
        return this.shortLabel
      }
    }
  },
  watch: {
    internalTaskDuration () { this.updateConfig() },
    internalShortDuration () { this.updateConfig() },
    internalLongDuration () { this.updateConfig() },
    internalVolume () { this.updateConfig() },
    internalEffect () { this.updateConfig() }
  },
  methods: {
    updateConfig () {
      // TODO This is bad style
      // eslint-disable-next-line vue/no-mutating-props
      const effect = new Audio(this.internalEffect)
      effect.volume = this.internalVolume / 100
      const newConfig = {
        ...this.pomodoro,
        durations: {
          task: this.internalTaskDuration * 60,
          short: this.internalShortDuration * 60,
          long: this.internalLongDuration * 60
        },
        soundEffect: effect,
        currentEffectFile: this.internalEffect
      }
      this.$emit('config', newConfig)
    },
    startPomodoro: function () {
      this.$emit('start')
    },
    stopPomodoro: function () {
      this.$emit('stop')
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
