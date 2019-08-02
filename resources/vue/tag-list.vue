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
    <div v-for="tag in getTags" class="tagspacer">
      <div class="tag" v-on:click.stop="tagSearch" v-bind:data-name="tag.name" v-bind:data-tippy-content="tag.desc" v-bind:style="col(tag.color)"></div>
    </div>
  </div>
</template>

<script>
module.exports = {
  props: [ 'tags' ],
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
      console.log('Starting search for tag ' + evt.target.dataset.name + '!')
    }
  }
}
</script>
