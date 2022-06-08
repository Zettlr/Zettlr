<template>
  <div role="tabpanel">
    <!-- References -->
    <h1>{{ referencesLabel }}</h1>
    <!-- Will contain the actual HTML -->
    <div v-html="referenceHTML"></div>
  </div>
</template>

<script lang="ts">
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ReferencesTab',
  computed: {
    referencesLabel: function (): string {
      return trans('gui.citeproc.references_heading')
    },
    bibliography: function (): any {
      return this.$store.state.bibliography
    },
    referenceHTML: function (): string {
      if (this.bibliography === undefined || this.bibliography[1].length === 0) {
        return `<p>${trans('gui.citeproc.references_none')}</p>`
      } else {
        const html = [this.bibliography[0].bibstart]

        for (const entry of this.bibliography[1]) {
          html.push(entry)
        }

        html.push(this.bibliography[0].bibend)

        return html.join('\n')
      }
    }
  }
})
</script>
