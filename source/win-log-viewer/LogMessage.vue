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
      <clr-icon v-show="hasDetails" v-bind:shape="iconShape"></clr-icon>
    </div>
  </div>
</template>

<script lang="ts">
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

import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LogMessage',
  props: {
    message: {
      type: Object,
      required: true
    }
  },
  data: function () {
    return {
      showDetails: false
    }
  },
  computed: {
    /**
     * Returns the shape for the CLR icon: either an arrow down or up
     *
     * @return  {string}  The clr icon's shape
     */
    iconShape: function () {
      return (this.showDetails) ? 'caret up' : 'caret down'
    },
    /**
     * Determines if this log message has additional details
     *
     * @return  {boolean}  True or false depending on the existence of details
     */
    hasDetails: function () {
      if (this.message.details === undefined) {
        return false
      }

      if (this.message.details instanceof Error) {
        return true
      }

      if (typeof this.message.details === 'object') {
        return Object.keys(this.message.details).length > 0
      }

      if (Array.isArray(this.message.details) || typeof this.message.details === 'string') {
        return this.message.details.length > 0
      }

      return true
    },
    /**
     * Parses the details attached to this log message depending on its type
     * into a plain text string
     *
     * @return  {string}  The parsed message
     */
    parsedDetails: function () {
      const detail = this.message.details
      let ret = ''
      if (detail instanceof Error) {
        const stack = detail.stack?.replace(/\n/g, '<br>')
        return `Name: ${detail.name}
Message: ${detail.message}
${stack}`
      } else if (typeof detail === 'object') {
        for (let param of Object.keys(detail)) {
          let val = (typeof detail[param] === 'object') ? JSON.stringify(detail[param]) : detail[param] + ''
          if (val.length > 1000) val = val.substring(0, 1000) + '… <span class="more">(' + (val.length - 1000) + ' more characters)</span>'
          ret += `${param}: ${val}\n`
        }
      } else if (Array.isArray(detail)) {
        for (let i = 0; i < detail.length; i++) {
          let val = (typeof detail[i] === 'object') ? JSON.stringify(detail[i]) : detail[i] + ''
          if (val.length > 1000) val = val.substring(0, 1000) + '… <span class="more">(' + (val.length - 1000) + ' more characters)</span>'
          ret += `[${i}]: ${val}`
        }
      } else {
        ret += `${detail}\n`
      }
      return ret
    }
  },
  methods: {
    /**
     * Determines the message class and maps the message levels into CSS classes
     *
     * @param   {number}  level  The level attached to the message
     *
     * @return  {string}         The CSS classes
     */
    messageClass: function (level: number) {
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
    },
    /**
     * Toggles display of this message's details on or off
     */
    toggleDetails: function () {
      if (this.hasDetails === false) {
        return
      }

      this.showDetails = !this.showDetails
    }
  }
})
</script>

<style lang="less">
  .message {
    width: 100%;
    transition: 0.5s all ease;
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
      background-color: #d8d8d8;
      color: rgb(131, 131, 131);

      &:hover { background-color: white; }
    }

    &.warning {
      background-color: rgb(236, 238, 97);
      color: rgb(139, 139, 24);

      &:hover { background-color: rgb(253, 253, 176); }
    }

    &.info {
      background-color: rgb(165, 204, 255);
      color: rgb(61, 136, 233);

      &:hover { background-color: rgb(217, 233, 255); }
    }

    &.error {
      background-color: rgb(255, 130, 130);
      color: rgb(139, 27, 27);

      &:hover { background-color: rgb(247, 188, 188); }
    }
  }
</style>
