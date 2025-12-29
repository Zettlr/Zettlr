<template>
  <PopoverWrapper v-bind:target="props.target">
    <ButtonControl
      v-if="hasFinishedTasks"
      v-bind:label="clearLabel"
      v-on:click="clearFinishedTasks"
    ></ButtonControl>
    <div id="lrt-wrapper">
      <div
        v-for="task in sortedTasks"
        v-bind:key="task.id"
        v-bind:class="{
          lrt: true,
          'in-progress': task.status === TaskStatus.ongoing,
          error: task.status === TaskStatus.error,
          aborted: task.status === TaskStatus.aborted
        }"
      >
        <h4 class="title">
          {{ task.title }}
        </h4>
        <div v-if="task.info" class="info">
          <span v-if="task.status !== TaskStatus.error">
            {{ task.info }}
          </span>
          <span v-if="task.error !== undefined">
            {{ task.error.name + ': ' + task.error.message }}
          </span>
        </div>
        <div class="metadata">
          <template v-if="task.currentTaskPercentage !== undefined && task.status === TaskStatus.ongoing">
            {{ formatPercentage(task.currentTaskPercentage) }}
          </template>
          <template v-else-if="task.status === TaskStatus.ongoing">
            {{ getDuration(task.startTime, currentTime, true) }}
          </template>
          <template v-else>
            {{ getDuration(task.startTime, task.endTime) }}
          </template>
        </div>
        <div class="status">
          <template v-if="task.status === TaskStatus.ongoing">
            <LoadingSpinner v-bind:spinner-size="16"></LoadingSpinner>
          </template>
          <template v-else-if="task.status === TaskStatus.error">
            <cds-icon shape="exclamation-triangle"></cds-icon>
          </template>
          <template v-else-if="task.status === TaskStatus.finished">
            <cds-icon shape="check"></cds-icon>
          </template>
          <template v-else-if="task.status === TaskStatus.aborted">
            <cds-icon shape="times"></cds-icon>
          </template>
        </div>
      </div>
    </div>
  </PopoverWrapper>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import type { LRT_JSON } from 'source/app/service-providers/long-running-tasks'
import { trans } from 'source/common/i18n-renderer'
import LoadingSpinner from 'source/common/vue/LoadingSpinner.vue'
import PopoverWrapper from 'source/common/vue/PopoverWrapper.vue'
import ButtonControl from 'source/common/vue/form/elements/ButtonControl.vue'
import { useLRTStore } from 'source/pinia'
import { TaskStatus } from 'source/pinia/lrt-store'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// Time in ms when running tasks should be updating
const REFRESH_INTERVAL = 100

const clearLabel = trans('Clear finished tasks')

const props = defineProps<{ target: HTMLElement }>()
const LRTStore = useLRTStore()

const sortedTasks = computed<LRT_JSON[]>(() => {
  return LRTStore.tasks.toSorted((a, b) => {
    // First sorting: after status
    const aOngoing = a.status === TaskStatus.ongoing ? 1 : 0
    const bOngoing = b.status === TaskStatus.ongoing ? 1 : 0
    const cmpResult = aOngoing - bOngoing

    if (cmpResult !== 0) {
      return cmpResult
    }

    // Next sorting: time
    const aST = DateTime.fromISO(a.startTime)
    const bST = DateTime.fromISO(b.startTime)

    return aST.diff(bST).milliseconds
  })
})

const hasRunningTasks = computed(() => {
  return LRTStore.tasks.some(t => t.status === TaskStatus.ongoing)
})

const hasFinishedTasks = computed(() => {
  return LRTStore.tasks.some(t => t.status !== TaskStatus.ongoing)
})

const currentTime = ref(DateTime.now().toISO())

let intervalTimer: NodeJS.Timeout|undefined

onMounted(() => {
  intervalTimer = setInterval(() => {
    if (hasRunningTasks.value) {
      currentTime.value = DateTime.now().toISO()
    }
  }, REFRESH_INTERVAL)
})

onBeforeUnmount(() => {
  clearInterval(intervalTimer)
})

function clearFinishedTasks () {
  const finishedTasks = LRTStore.tasks.filter(t => t.status !== TaskStatus.ongoing)

  for (const task of finishedTasks) {
    LRTStore.deleteTask(task.id)
  }
}

/**
 * Should return a human-readable version of the difference between start and end.
 *
 * @param   {string}   start     The start time
 * @param   {string}   end       The end time
 * @param   {boolean}  highPrec  Whether to return fractional seconds
 *
 * @return  {string}             The duration as a string
 */
function getDuration (start: string, end: string|undefined, highPrec = false): string {
  const st = DateTime.fromISO(start)
  const et = end !== undefined ? DateTime.fromISO(end) : DateTime.now()

  const debug = et.diff(st, [ 'minutes', 'seconds' ])
  if (!debug.isValid) {
    console.warn(debug.invalidReason, debug.invalidExplanation)
    console.log({ start, st: st.toISO(), et: et.toISO() })
  }

  if (highPrec) {
    return et
      .diff(st, [ 'minutes', 'seconds' ]) // Calculate the difference
      .toHuman({ unitDisplay: 'short' }) // Convert to string
  } else {
    return et
      .diff(st, [ 'minutes', 'seconds', 'milliseconds' ]) // Calculate the difference
      .set({ milliseconds: 0 }) // Avoid fractional seconds if asked
      .rescale() // Ensure the duration uses the most compact format (seconds, minutes, or hours)
      .toHuman({ unitDisplay: 'short' }) // Convert to string
  }
}

function formatPercentage (perc: number, roundTo = 2): string {
  // First, percentages in the LRT provider are always fractions.
  perc *= 100

  const factor = 10 ** roundTo
  perc = Math.round(perc * factor) / factor

  return `${perc}%`
}

</script>


<style lang="css" scoped>
#lrt-wrapper {
  padding: 10px;

  .lrt:not(:last-child) {
    border-bottom: 1px solid rgb(100, 100, 100);
    padding-bottom: 5px;
    margin-bottom: 5px;
  }

  .lrt {
    min-width: 200px;
    display: grid;
    grid-template-areas: "title title" "info info" "metadata status";
    grid-template-columns: auto 24px;
    gap: 5px;

    &.error { 
      color: #e41818;

      .info { color: inherit; }
    }

    .title {
      grid-area: title;
      font-size: 1em;
    }

    .info {
      grid-area: info;
      font-size: 0.8em;

      color: rgb(100, 100, 100);
    }

    .metadata {
      font-size: 0.8em;
      grid-area: metadata;
    }

    .status {
      grid-area: status;
      text-align: right;
    }
  }
}

@media (prefers-color-scheme: dark) {
  #lrt-wrapper .lrt {
    .info {
      color: rgb(142 142 142);
    }

    &.error { color: #ff1212; }
  }
}
</style>
