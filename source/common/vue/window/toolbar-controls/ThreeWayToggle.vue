<template>
  <div
    v-bind:id="`toolbar-${control.id}`"
    v-bind:class="{
      'three-way-toggle': true,
      'active': activeState !== undefined
    }"
  >
    <button
      role="button"
      v-bind:aria-pressed="isStateOneActive"
      v-bind:class="{
        'active': isStateOneActive,
        [control.activeClass]: control.activeClass !== undefined && isStateOneActive
      }"
      v-bind:title="control.stateOne.title"
      v-on:click="toggle('stateOne')"
    >
      <cds-icon v-if="control.stateOne.icon" v-bind:shape="control.stateOne.icon"></cds-icon>
    </button>
    <!-- Second state -->
    <button
      role="button"
      v-bind:aria-pressed="isStateTwoActive"
      v-bind:class="{
        'active': isStateTwoActive,
        [control.activeClass]: control.activeClass !== undefined && isStateTwoActive
      }"
      v-bind:title="control.stateTwo.title"
      v-on:click="toggle('stateTwo')"
    >
      <cds-icon v-if="control.stateTwo.icon" v-bind:shape="control.stateTwo.icon"></cds-icon>
    </button>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ThreeWayToggle
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Specific implementation of a toggle with three states on the
 *                  toolbar. Basically uses two adjacent buttons to model three
 *                  states: No button pressed, first button pressed, and second
 *                  button pressed. For an example see the implementation of the
 *                  file manager/global search views in the main window.
 *
 * END HEADER
 */

export default {
  name: 'ThreeWayToggle',
  props: {
    control: {
      type: Object,
      default: function () { return {} }
    }
  },
  emits: ['toggle'],
  data: function () {
    return {
      activeState: this.control.initialState
    }
  },
  computed: {
    controlActiveChanged: function () {
      return this.control.initialState
    },
    isStateOneActive: function () {
      return this.activeState === this.control.stateOne.id
    },
    isStateTwoActive: function () {
      return this.activeState === this.control.stateTwo.id
    }
  },
  watch: {
    controlActiveChanged: function () {
      this.activeState = this.control.initialState
    }
  },
  methods: {
    toggle: function (state) {
      if (state === 'stateOne' && this.isStateOneActive === true) {
        // De-activate
        this.activeState = undefined
      } else if (state === 'stateOne') {
        // Activate state one
        this.activeState = this.control.stateOne.id
      } else if (state === 'stateTwo' && this.isStateTwoActive === true) {
        // De-activate
        this.activeState = undefined
      } else {
        // Activate state two
        this.activeState = this.control.stateTwo.id
      }

      this.$emit('toggle', this.activeState)
    }
  }
}
</script>

<style lang="less">
body.darwin {
  div#toolbar div.three-way-toggle {
    border-radius: 4px;
    margin: 0 10px;
    border: 1px solid transparent;
    display: flex;

    &:hover { border-color: rgb(180, 180, 180); }
    &.active { background-color: rgb(230, 230, 230); }

    button {
      &:first-child {
        border-top-right-radius: 0px;
        border-bottom-right-radius: 0px;
      }
      &:last-child {
        border-top-left-radius: 0px;
        border-bottom-left-radius: 0px;
      }

      &.active { background-color: rgb(200, 200, 200); }
    }
  }

  &.dark div#toolbar div.three-way-toggle {
    &:hover { border-color: rgb(80, 80, 80); }
    &.active { background-color: rgb(60, 60, 60); }
    button.active { background-color: rgb(50, 50, 50); }
  }
}

body.win32 {
  div#toolbar div.three-way-toggle {
    margin: 0 10px;
    border: 2px solid transparent;

    &:hover { border-color: rgb(180, 180, 180); }
    &.active { background-color: rgb(230, 230, 230); }
    button.active { background-color: rgb(200, 200, 200); }
  }

  &.dark div#toolbar div.three-way-toggle {
    &:hover { border-color: rgb(80, 80, 80); }
    &.active { background-color: rgb(60, 60, 60); }
    button.active { background-color: rgb(50, 50, 50); }
  }
}

body.linux {
  div#toolbar div.three-way-toggle {
    margin: 0 10px;
    border: 2px solid transparent;
    display: flex;

    button {
      margin: 0;
      border-radius: 0;
    }

    button:first-child {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
      border-right: none;
    }

    button:last-child {
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }

    button.active { background-color: rgb(228, 228, 228); }
  }

  &.dark div#toolbar div.three-way-toggle {
    button.active { background-color: rgb(50, 50, 50); }
  }
}
</style>
