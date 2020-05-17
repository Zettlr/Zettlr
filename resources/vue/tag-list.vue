/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TagList Vue component
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a tag list for a file item.
 *
 * END HEADER
 */

<template>
  <div class="taglist">
    <div
      v-for="(tag, index) in getTags"
      v-bind:key="index"
      class="tagspacer"
    >
      <div
        class="tag"
        v-bind:data-name="tag.name"
        v-bind:data-tippy-content="tag.desc"
        v-bind:style="col(tag.color)"
        v-on:click.stop="tagSearch"
      ></div>
    </div>
  </div>
</template>

<script>
module.exports = {
  props: ['tags'],
  data: () => {
    return {
      // Nothing in here
    }
  },
  computed: {
    getTags: function () { return this.$store.getters.tags(this.tags) }
  },
  methods: {
    col: function (col) {
      return 'background-color: ' + col
    },
    tagSearch: function (evt) {
      global.application.globalSearch('#' + evt.target.dataset.name)
    }
  }
}
</script>
