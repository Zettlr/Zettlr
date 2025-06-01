<template>
  <PopoverWrapper v-bind:target="target" v-on:close="$emit('close')">
    <template v-if="isRunning">
      <!-- Display pomodoro timer & phase progress -->
      <div class="pomodoro-visual-wrapper">
        <svg viewBox="0 0 120 120" class="pomodoro-ring">
          <!-- Outer Progress Circle (Background) -->
          <circle
            class="outer-bg"
            cx="60" cy="60" r="54"
            fill="none" stroke="#eee"
            stroke-width="8"
          />
          <!-- Outer Progress Circle (Dynamic Progress) -->
          <circle
            class="outer-progress"
            cx="60" cy="60" r="54"
            fill="none"
            stroke="#4caf50"
            stroke-width="8"
            stroke-linecap="round"
            v-bind:stroke-dasharray="circumference"
            v-bind:stroke-dashoffset="progressOffset"
            transform="rotate(-90 60 60)"
          />

          <!-- Inner Segmented Circle -->
          <g v-for="(phase, index) in cycle" v-bind:key="index">
            <path
              v-bind:d="describeArc(60, 60, 40, index * 45, (index + 1) * 45)"
              v-bind:stroke="index < currentCycleIndex ? segmentColors[phase as 'task' | 'short' | 'long'] : 
                dimmedSegmentColors[phase as 'task' | 'short' | 'long']"
              stroke-width="8"
              fill="none"
            >
              <title>{{ phaseTitles[phase as 'task' | 'short' | 'long'] }}</title>
            </path>

            <circle
              v-if="index === currentCycleIndex"
              v-bind:cx="polarToCartesian(60, 60, 44, (index + 0.5) * anglePerSegment).x"
              v-bind:cy="polarToCartesian(60, 60, 44, (index + 0.5) * anglePerSegment).y"
              r="3"
              fill="#000"
            />
          </g>


          <text
            x="60"
            y="65"
            text-anchor="middle"
            alignment-baseline="middle"
            font-size="8"
            fill="#333"
          >
            {{ props.pomodoro.totalTasks }} Work Sessions ✔
          </text>

        </svg>

        <!-- Display running time -->
        <p class="pomodoro-big"> 
          {{ remainingTimeFormatted }}
        </p>
        <p class="pomodoro-big"> 
          {{ currentPhaseLabel }}
        </p>
        <p class="pomodoro-info"> 
          Total work sessions completed: {{ props.pomodoro.totalTasks }}
        </p>
        <hr>
        <button v-on:click="stopPomodoro">
          {{ stopLabel }}
        </button>
      </div>
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
const stopLabel = trans('Stop')
const taskLabel = trans('Work')
const shortLabel = trans('Short break')
const longLabel = trans('Break')
const soundEffectsLabel = trans('Sound Effect')
const volumeLabel = trans('Volume')


const props = defineProps<{
  target: HTMLElement
  pomodoro: PomodoroConfig
  soundEffects: Array<{ label: string, file: string }>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'start'): void
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

// Pomodoro progress display
const cycle = [ 'task', 'short', 'task', 'short', 'task', 'short', 'task', 'long' ]
const currentCycleIndex = computed(() => {
  const count = props.pomodoro.counter
  const progress = count.task + count.short + count.long
  return Math.min(progress, cycle.length)
})
  
const anglePerSegment = 360 / cycle.length

const phaseTitles: Record<'task' | 'short' | 'long', string> = {
  task: 'Work Session',
  short: 'Short Break',
  long: 'Long Break'
}

const circumference = 2 * Math.PI * 54
const percentage = computed(() => {
  const elapsed = props.pomodoro.phase.elapsed
  const total = props.pomodoro.durations[props.pomodoro.phase.type]
  return (elapsed / total) * 100
})
const progressOffset = computed(() => {
  return circumference * (1 - percentage.value / 100)
})

// For phase coloring
const segmentColors: Record<'task' | 'short' | 'long', string> = {
  task: '#e74c3c',
  short: '#2ecc71',
  long: '#3498db'
}

const dimmedSegmentColors: Record<'task' | 'short' | 'long', string> = {
  task: '#f8d7da',
  short: '#d4edda',
  long: '#d1ecf1'
}

// Arc helpers
function polarToCartesian (cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180.0
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  }
}

function describeArc (cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}


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
.pomodoro-progress {
  display: flex;
  justify-content: center;
  margin: 10px 0;
  gap: 6px;
}
.phase-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid #555; 
  box-sizing: border-box;
}
//Incomplete phase colours 
.phase-indicator.task {
  background-color: #f8d7da;
}
.phase-indicator.short {
  background-color: #d4edda;
}
.phase-indicator.long {
  background-color: #d1ecf1;
}
//Completed phase colours
.phase-indicator.completed.task {
  background-color: #e74c3c;
}
.phase-indicator.completed.short {
  background-color: #2ecc71;
}
.phase-indicator.completed.long {
  background-color: #3498db;
}
.pomodoro-visual-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
}
.outer-progress {
  transition: stroke-dashoffset 0.5s ease-in-out;
}
.pomodoro-ring {
  width: 200px;
  height: 200px;
  //transform: rotate(90deg);
}
.outer-bg {
  stroke: #ddd;
}
</style>
