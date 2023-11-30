<template>
  <div class="split-view">
    <div
      v-if="hasHiddenView !== 1"
      ref="view1"
      class="view"
      v-bind:style="{ width: `${view1Width}px` }"
    >
      <slot name="view1"></slot>
    </div>
    <div
      v-if="hasHiddenView === 0"
      class="horizontal-resizer"
      v-on:mousedown="beginViewResizing"
    ></div> <!-- Enable resizing of the view -->
    <div
      v-if="hasHiddenView !== 2"
      ref="view2"
      v-bind:class="{
        view: true,
        'view-border': hasHiddenView === 0
      }"
      v-bind:style="{ width: `${view2Width}px` }"
    >
      <slot name="view2"></slot>
    </div>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SplitView
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Implements split views (two horizontal panes with a movable
 *                  separator in the middle). Split views can also be hidden.
 *
 * END HEADER
 */

export default {
  name: 'SplitView',
  props: {
    split: {
      type: String,
      default: 'horizontal' // NOTE: Not yet implemented b/c I don't need it yet
    },
    minimumSizePercent: {
      type: Array,
      default: function () { return [ 20, 20 ] } // Default min 20% width
    },
    initialSizePercent: {
      type: Array,
      default: function () { return [ 50, 50 ] } // Default same width
    }
  },
  data: function () {
    const availableSize = window.innerWidth
    return {
      availableSize,
      viewResizing: false,
      viewResizeX: 0,
      // Initial widths
      view1Width: availableSize * (this.initialSizePercent[0] / 100),
      view2Width: availableSize * (this.initialSizePercent[1] / 100),
      // Minimum widths
      view1WidthMin: availableSize * (this.minimumSizePercent[0] / 100),
      view2WidthMin: availableSize * (this.minimumSizePercent[1] / 100),
      // Properties necessary for hiding views programmatically
      originalViewWidth: [ 0, 0 ],
      hasHiddenView: 0, // Is 1 or 2 if one view is hidden
      observer: new ResizeObserver(this.recalculateSizes)
    }
  },
  created: function () {
    window.addEventListener('resize', this.recalculateSizes)
  },
  unmounted: function () {
    // Stop listening to any size changes
    window.removeEventListener('resize', this.recalculateSizes)
    this.observer.unobserve(this.$el)
  },
  mounted: function () {
    // As soon as the element is mounted, get the correct width
    this.recalculateSizes()
    // Begin observing changes to the element size
    this.observer.observe(this.$el, { box: 'border-box' })
  },
  methods: {
    recalculateSizes: function (_event) {
      // Save the current ratios before applying the new widths
      const view1Percent = this.view1Width / this.availableSize
      const view2Percent = this.view2Width / this.availableSize
      this.availableSize = this.$el.getBoundingClientRect().width

      if (this.hasHiddenView === 1) {
        // Give view 2 all of the available size
        this.view2Width = this.availableSize
      } else if (this.hasHiddenView === 2) {
        // Give view 1 all of the available size
        this.view1Width = this.availableSize
      } else { // Else: this.hasHiddenView === 0
        // Scale both proportionally
        this.view1Width = this.availableSize * view1Percent
        this.view2Width = this.availableSize * view2Percent
      }

      // Don't forget to also update the minimum widths
      this.view1WidthMin = this.availableSize * (this.minimumSizePercent[0] / 100)
      this.view2WidthMin = this.availableSize * (this.minimumSizePercent[1] / 100)
    },
    beginViewResizing: function (event) {
      this.viewResizing = true
      this.viewResizeX = event.clientX
      this.$el.addEventListener('mousemove', this.onViewResizing)
      this.$el.addEventListener('mouseup', this.endViewResizing)
    },
    onViewResizing: function (event) {
      if (this.viewResizing === false) {
        return
      }

      // x > 0 means: Direction -->
      // x < 0 means: Direction <--
      let offsetX = event.clientX - this.viewResizeX
      // Make sure the views don't get resized too much
      if (offsetX > 0 && this.view2Width > this.view2WidthMin) {
        // Increase view1 in size
        this.view1Width += offsetX
        this.view2Width = this.availableSize - this.view1Width
      } else if (offsetX < 0 && this.view1Width > this.view1WidthMin) {
        // Increase view2 in size
        this.view2Width -= offsetX
        this.view1Width = this.availableSize - this.view2Width
      }

      this.viewResizeX = event.clientX
    },
    /**
     * Stops resizing of the inner elements on release of the mouse button.
     * @param {MouseEvent} evt The associated event
     */
    endViewResizing: function (event) {
      this.viewResizing = false
      this.viewResizeX = 0
      this.$el.removeEventListener('mousemove', this.onViewResizing)
      this.$el.removeEventListener('mouseup', this.endViewResizing)
    },
    hideView: function (viewNumber) {
      // Enables you to hide one of the views programmatically. First, we need
      // to un-hide any view if applicable. Then, we need to hide the view in
      // a second step.
      this.unhide()

      // Now no view is hidden at this point.
      this.hasHiddenView = viewNumber
      this.originalViewWidth = [
        this.view1Width / this.availableSize,
        this.view2Width / this.availableSize
      ]
      if (viewNumber === 1) {
        this.view2Width += this.view1Width
        this.view1Width = 0
      } else {
        this.view1Width += this.view2Width
        this.view2Width = 0
      }
    },
    unhide: function () {
      if (this.hasHiddenView > 0) {
        // Un-hide
        this.view1Width = this.originalViewWidth[0] * this.availableSize
        this.view2Width = this.originalViewWidth[1] * this.availableSize
        this.hasHiddenView = 0
        // After we've unhidden the view, make sure to recalculate possibly
        // changed metrics in the meantime.
        this.recalculateSizes()
      }
    }
  }
}
</script>

<style lang="less">
body div.split-view {
  display: flex;
  height: 100%;

  div.view {
    overflow: auto;
    &.view-border {
      border-left: 1px solid rgb(213, 213, 213);
      margin-left: -6px; // Account for resizer
    }

    &:not(.view-border) {
      margin-right: -5px; // Account for resizer
    }
  }

  div.horizontal-resizer {
    cursor: col-resize;
    width: 11px; // 1px width plus 5px margin to either side
    z-index: 1; // Make sure the resizers are always on top
    height: 100%;
  }
}

body.dark div.split-view {
  div.view.view-border {
    border-color: rgb(80, 80, 80);
  }
}
</style>
