/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileItem Vue component.
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a single file list item.
 *
 * END HEADER
 */
<template>
  <div
    v-bind:class="{
      'list-item': true,
      'has-meta-info': fileMeta,
      'directory': obj.type === 'directory'
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
</template>

<script>
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
      this.$refs['name-input'].select()
    }
  }
}
</script>

<style lang="less">
// Don't duplicate the styles of the file item
</style>
