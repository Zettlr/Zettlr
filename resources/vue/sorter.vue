<template>
  <div class="sorter">
    <clr-icon
      class="sortType"
      v-bind:shape="type"
      v-on:click.stop="toggleType()"
    >
      <!-- Same line to remove the nbsp added by Chrome -->
    </clr-icon><clr-icon
      class="sortDirection"
      shape="sort-by"
      v-bind:flip="flip"
      v-on:click.stop="toggleDirection()"
    ></clr-icon>
  </div>
</template>

<script>
module.exports = {
  props: [
    'sorting'
  ],
  name: 'sorter',
  computed: {
    type: function () { return this.sorting.startsWith('time') ? 'clock' : 'text' },
    flip: function () { return this.sorting.endsWith('up') ? 'vertical' : '' }
  },
  methods: {
    toggleType: function () {
      if (this.sorting.startsWith('time')) {
        this.$emit('sort-change', this.sorting.replace('time', 'name'))
      } else {
        this.$emit('sort-change', this.sorting.replace('name', 'time'))
      }
    },
    toggleDirection: function () {
      if (this.sorting.endsWith('up')) {
        this.$emit('sort-change', this.sorting.replace('up', 'down'))
      } else {
        this.$emit('sort-change', this.sorting.replace('down', 'up'))
      }
    }
  }
}
</script>
