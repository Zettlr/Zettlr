<template>
  <div
    v-bind:class="messageClass(message.level)"
    v-on:click.stop="toggleDetails"
  >
    <div class="timestamp">
      [{{ message.time }}]
    </div>
    <div class="msg">
      {{ message.message }}
      <div
        ref="details"
        v-bind:class="{
          details: true,
          hidden: !showDetails
        }"
      >
        {{ parsedDetails }}
      </div>
    </div>
    <div class="expand-details">
      <cds-icon v-show="hasDetails" shape="angle" v-bind:direction="iconDirection"></cds-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Message
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a single log message nicely.
 *
 * END HEADER
 */

import { type LogMessage } from 'source/app/service-providers/log'
import { ref, computed } from 'vue'

const props = defineProps<{
  message: LogMessage
}>()

const showDetails = ref(false)

/**
 * Returns the shape for the CLR icon: either an arrow down or up
 *
 * @return  {string}  The clr icon's shape
 */
const iconDirection = computed(() => showDetails.value ? 'up' : 'down')

/**
 * Determines if this log message has additional details
 *
 * @return  {boolean}  True or false depending on the existence of details
 */
const hasDetails = computed(() => {
  if (props.message.details === undefined) {
    return false
  }

  if (props.message.details instanceof Error) {
    return true
  }

  if (Array.isArray(props.message.details)) {
    return props.message.details.length > 0
  }

  if (typeof props.message.details === 'object') {
    return Object.keys(props.message.details).length > 0
  }

  if (Array.isArray(props.message.details) || typeof props.message.details === 'string') {
    return props.message.details.length > 0
  }

  return true
})

/**
 * Parses the details attached to this log message depending on its type
 * into a plain text string
 *
 * @return  {string}  The parsed message
 */
const parsedDetails = computed(() => {
  const detail = props.message.details
  let ret = ''
  if (detail instanceof Error) {
    const stack = detail.stack?.replace(/\n/g, '<br>') ?? ''
    return [
      `Name: ${detail.name}`,
      `Message: ${detail.message}`,
      stack
    ].join('\n')
  } else if (Array.isArray(detail)) {
    for (let i = 0; i < detail.length; i++) {
      let val = (typeof detail[i] === 'object') ? JSON.stringify(detail[i]) : String(detail[i]) + ''
      if (val.length > 1000) {
        val = val.substring(0, 1000) + '… <span class="more">(' + (val.length - 1000) + ' more characters)</span>'
      }
      ret += `[${i}]: ${val}`
    }
  } else if (typeof detail === 'object') {
    for (const param of Object.keys(detail)) {
      let val = (typeof detail[param] === 'object') ? JSON.stringify(detail[param]) : String(detail[param]) + ''
      if (val.length > 1000) {
        val = val.substring(0, 1000) + '… <span class="more">(' + (val.length - 1000) + ' more characters)</span>'
      }
      ret += `${param}: ${val}\n`
    }
  } else {
    ret += `${detail}\n`
  }
  return ret
})

/**
 * Determines the message class and maps the message levels into CSS classes
 *
 * @param   {number}  level  The level attached to the message
 *
 * @return  {string}         The CSS classes
 */
function messageClass (level: number): string {
  const classes = ['message']
  switch (level) {
    case 1:
      classes.push('verbose')
      break
    case 2:
      classes.push('info')
      break
    case 3:
      classes.push('warning')
      break
    case 4:
      classes.push('error')
      break
  }
  return classes.join(' ')
}

/**
 * Toggles display of this message's details on or off
 */
function toggleDetails (): void {
  if (!hasDetails.value) {
    return
  }

  showDetails.value = !showDetails.value
}
</script>

<style lang="css">
.message {
  width: 100%;
  transition: 0.1s all ease;
  border-bottom: 1px solid rgb(128, 128, 128);
  display: flex;

  .timestamp {
    flex-grow: 0;
    font-weight: bold;
  }

  .msg { flex-grow: 10; }

  .expand-details {
    flex-grow: 0;
    color: black;
  }

  .timestamp, .msg, .expand-details { padding: 4px 10px; }

  .timestamp, .details { font-weight: bold; }

  .details {
    font-family: 'Menlo', 'Courier New', Courier, monospace;
    white-space: pre;
    margin-top: 15px;
  }

  .message .details .more { color: #000; }

  &.verbose {
    background-color: var(--zettlr-note-bg);
    color: var(--zettlr-note-color);

    &:hover { filter: brightness(120%); }
  }

  &.warning {
    color: var(--zettlr-warning-color);
    background-color: var(--zettlr-warning-bg);

    &:hover { filter: brightness(120%); }
  }

  &.info {
    background-color: var(--zettlr-info-bg);
    color: var(--zettlr-info-color);

    &:hover { filter: brightness(120%); }
  }

  &.error {
    background-color: var(--zettlr-caution-bg);
    color: var(--zettlr-caution-color);

    &:hover { filter: brightness(120%); }
  }
}
</style>
