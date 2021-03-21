<template>
  <div class="table-generator">
    <!-- Display a 12x12 grid -->
    <div
      v-for="row in 12"
      v-bind:key="row"
      class="row"
    >
      <div
        v-for="col in 12"
        v-bind:key="col"
        v-bind:class="{
          'cell': true,
          'active': intermediaryTableSize.rows >= row && intermediaryTableSize.cols >= col
        }"
        v-on:mouseover="setIntermediarySize(row, col)"
        v-on:click="handleClick()"
      ></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PopoverTable',
  components: {
  },
  data: function () {
    return {
      tableSize: undefined,
      intermediaryTableSize: {
        rows: 0,
        cols: 0
      }
    }
  },
  computed: {
    popoverData: function () {
      return {
        tableSize: this.tableSize
      }
    }
  },
  methods: {
    handleClick: function () {
      // Write the intermediary size into our returned variable to result in a
      // table being generated.
      this.tableSize = this.intermediaryTableSize
    },
    setIntermediarySize: function (row, col) {
      this.intermediaryTableSize = {
        rows: row,
        cols: col
      }
    }
  }
}
</script>

<style lang="less">
body {
  .table-generator {
    padding: 5px;
  }

  .table-generator .row .cell {
    background-color: rgb(200, 200, 200);
    border: 1px solid rgb(80, 80, 80);
    width: 10px;
    height: 10px;
    margin: 1px;

    &.active {
      background-color: rgb(230, 230, 230);
    }
  }
}
</style>
