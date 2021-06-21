<template>
  <div
    v-bind:class="{
      'list-item-wrapper': true,
      'odd': index % 2 === 1,
      'even': index % 2 === 0
    }"
  >
    <div
      v-bind:class="{
        'list-item': true,
        'has-meta-info': fileMeta
      }"
    >
      <div class="filename">
        <input
          ref="name-input"
          type="text"
          v-bind:value="obj.name"
          v-on:keyup.enter="$emit('submit', $event.target.value)"
          v-on:keyup.esc="$emit('cancel')"
          v-on:blur="$emit('cancel')"
          v-on:click.stop=""
        >
      </div>
    </div>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Mock FileItem
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     It looks like a file item, but it isn't: This component is
 *                  being rendered whenever a new file or directory is being
 *                  created in the file list. Basically a glorified text input.
 *
 * END HEADER
 */

export default {
  name: 'FileMockItem',
  // Bind the actual object to the container
  props: {
    obj: {
      type: Object,
      default: function () { return {} }
    }
  },
  computed: {
    isDirectory: function () {
      return this.obj.type === 'directory'
    },
    fileMeta: function () {
      return this.$store.state.config['fileMeta']
    }
  },
  mounted: function () {
    setTimeout(() => {
      // TODO: If this timeout is set too fast, the file list somehow aborts the
      // process automatically. Have to investigate.
      this.focusInput()
    }, 500)
  },
  methods: {
    focusInput: function () {
      this.$refs['name-input'].focus()
      // Select from the beginning until the last dot
      this.$refs['name-input'].setSelectionRange(
        0,
        this.$refs['name-input'].value.lastIndexOf('.')
      )
    }
  }
}
</script>

<style lang="less">
// Don't duplicate the styles of the file item
</style>
