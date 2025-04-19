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
      <button class="timer-button" v-on:click="stopPomodoro">
        {{ stopLabel }}
      </button>
      <button class="timer-button" v-on:click="pausePomodoro">
        {{ pauseLabel }}
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
      <button class="timer-button" v-on:click="startPomodoro">
        {{ startLabel }}
      </button>
    </template>
  </PopoverWrapper>
</template>

<script setup lang="ts">
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
import { ref, computed, watch } from 'vue'
import type { PomodoroConfig } from './App.vue'

const startLabel = trans('Start')
const pauseLabel = computed(() => props.isPaused ? trans('Resume') : trans('Pause'))
const stopLabel = trans('Stop')
const taskLabel = trans('Work')
const shortLabel = trans('Short break')
const longLabel = trans('Break')
const soundEffectsLabel = trans('Sound Effect')
const volumeLabel = trans('Volume')

const props = defineProps<{
  target: HTMLElement
  pomodoro: PomodoroConfig
  isPaused: boolean
  soundEffects: Array<{ label: string, file: string }>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'start'): void
  (e: 'pause'): void
  (e: 'stop'): void
  (e: 'config', value: PomodoroConfig): void
}>()

const internalVolume = ref(props.pomodoro.soundEffect.volume * 100)
const internalEffect = ref(props.pomodoro.currentEffectFile)
const internalShortDuration = ref(props.pomodoro.durations.short / 60)
const internalTaskDuration = ref(props.pomodoro.durations.task / 60)
const internalLongDuration = ref(props.pomodoro.durations.long / 60)

const optionizedEffects = computed(() => {
  const opt: Record<string, string> = {}
  for (const effect of props.soundEffects) {
    opt[effect.file] = effect.label
  }
  return opt
})

const isRunning = computed(() => props.pomodoro.intervalHandle !== undefined)

const remainingTimeFormatted = computed(() => {
  const currentDuration = props.pomodoro.durations[props.pomodoro.phase.type]
  const timeRemaining = currentDuration - props.pomodoro.phase.elapsed
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const minStr = (minutes < 10) ? `0${minutes}` : String(minutes)
  const secStr = (seconds < 10) ? `0${seconds}` : String(seconds)
  return `${minStr}:${secStr}`
})

const currentPhaseLabel = computed(() => {
  if (props.pomodoro.phase.type === 'task') {
    return taskLabel
  } else if (props.pomodoro.phase.type === 'long') {
    return longLabel
  } else {
    return shortLabel
  }
})

watch(internalTaskDuration, updateConfig)
watch(internalShortDuration, updateConfig)
watch(internalLongDuration, updateConfig)
watch(internalVolume, updateConfig)
watch(internalEffect, updateConfig)

function updateConfig (): void {
  const effect = new Audio()
  effect.src = internalEffect.value
  effect.volume = internalVolume.value / 100
  const newConfig = {
    ...props.pomodoro,
    durations: {
      task: internalTaskDuration.value * 60,
      short: internalShortDuration.value * 60,
      long: internalLongDuration.value * 60
    },
    soundEffect: effect,
    currentEffectFile: internalEffect.value
  }
  emit('config', newConfig)
}

function startPomodoro (): void {
  emit('start')
}

function pausePomodoro (): void {
  emit('pause')
}

function stopPomodoro (): void {
  emit('stop')
}
</script>

<style lang="less">
  p.pomodoro-big {
    font-size: 200%;
    text-align: center;
    margin: 10px;
  }

  //add right‑margin except on the last button
  .timer-button:not(:last-child) {
    margin-right: 8px;
  }
</style>
