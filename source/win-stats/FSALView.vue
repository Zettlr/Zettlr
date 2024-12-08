<template>
  <div id="fsal-container">
    <!-- fsalStatistics -->
    <!--
    We want to draw two box-plots, one for characters and one for words:
    |         |----------|==========|======|---------|         |
    Minimum   Lower 99%  Lower 95%  Mean  Upper 95%  Upper 99% Maximum
    We're gonna use SVG for that shit. Because we can.
    -->

    <!--
    TODO: We need to differentiate between the words- and chars setting
    and show the corresponding graph and NOT just the word-graph as we do here!
    -->
    <!-- TODO: Apply better styling! -->
    <h2>Word and file frequency</h2>
    <p>
      In below's graphic, you can see certain measurements that have been
      taken across all your files in what is known as a "box-plot." The
      three vertical lines indicate the
      <strong>smallest file ({{ minWords }} words)</strong>,
      the
      <strong>average file size ({{ meanWords }} words)</strong>,
      and the
      <strong>largest file ({{ maxWords }} words)</strong>.
      The lean rectangle indicates the so-called
      <strong>95 percent interval</strong>,
      and the slightly higher rectangle indicates the
      <strong>68 percent interval</strong>.
      This means that 68 percent of your files contain between
      <strong>{{ words68PercentLower }} and {{ words68PercentUpper }} words</strong>,
      and 95 percent of your files contain between
      <strong>{{ words95PercentLower }} and {{ words95PercentUpper }} words</strong>.
    </p>
    <p>
      If your mean and both intervals are cramped to the left side of the
      graphic, this means that you have a few extraordinarily large files.
      If your mean is close to the center of the graphic and the intervals
      arrange neatly around it, this indicates that the sizes of your files
      are balanced and resemble a bell curve.
    </p>
    <!--
    NOTE: We are using a small hack to keep the aspect ratio. If you use a
    padding-top on a relatively positioned container with width 100 %, any
    absolutely positioned child that is supposed to fill the whole container
    will be resized relatively. padding-top in the parent container
    corresponds to the wanted aspect ratio (e.g. 16:9 -> about 56 %), which
    means we'll just directly compute this here on the element.
    -->
    <div
      id="box-plot-fsal-stats-words"
      v-bind:style="`padding-top: ${boxPlotData.height/boxPlotData.width*100}%`"
    >
      <!--
      This SVG has an aspect ratio of around 8:1. By setting preserveAspectRatio
      to xMidYMid, we ensure the graphic will be centered (regardless of the viewBox).
        -->
      <svg
        id="box-plot"
        v-bind:viewBox="`0 0 ${boxPlotData.width} ${boxPlotData.height}`"
        preserveAspectRatio="xMidYMid"
      >
        <!-- We have a viewbox from zero to maximum, so we can calculate everything -->
        <!-- Before everything, mark the full range that we have -->
        <rect
          x="0" y="43" width="100%"
          height="4" class="magenta"
        />

        <!-- First, the bigger box, includes the 95% interval -->
        <g class="interactive hover-text">
          <rect
            class="navy"
            v-bind:x="boxPlotData.interval95Start"
            y="25"
            v-bind:width="boxPlotData.interval95End"
            height="40"
          />
          <!-- Interval bracket -->
          <path
            v-bind:d="`M${boxPlotData.interval95Start} 100 l0 40 l${boxPlotData.interval95End} 0 l0 -40`"
            stroke-width="5" stroke="white" fill="none"
          />
          <text
            x="50%" y="180" fill="white"
            stroke="white" font-size="30px"
          >
            95% Interval: {{ words95PercentLower }} – {{ words95PercentUpper }}
          </text>
        </g>
        <!-- Second, the smaller box, includes the 68% interval -->
        <g class="interactive hover-text">
          <rect
            class="blue"
            v-bind:x="boxPlotData.interval68Start"
            y="15"
            v-bind:width="boxPlotData.interval68End"
            height="60"
          />
          <!-- Interval bracket -->
          <path
            v-bind:d="`M${boxPlotData.interval68Start} 100 l0 20 l${boxPlotData.interval68End} 0 l0 -20`"
            stroke-width="5" stroke="white" fill="none"
          />
          <text
            x="50%" y="180" fill="white"
            stroke="white" font-size="30px"
          >
            68% Interval: {{ words68PercentLower }} – {{ words68PercentUpper }}
          </text>
        </g>

        <!-- Third, the other values: mean, min, and max -->
        <g class="interactive hover-text">
          <!-- minWords -->
          <rect
            class="interactive cyan" x="-0.5%" y="5"
            width="1%" height="80"
          />
          <text
            x="50%" y="180" fill="white"
            stroke="white" font-size="30px"
          >
            Minimum: {{ minWords }}
          </text>
        </g>
        <g class="interactive hover-text">
          <!-- meanWords -->
          <rect
            class="interactive cyan" v-bind:x="boxPlotData.mean" y="5"
            width="1%" height="80"
          />
          <text
            x="50%" y="180" fill="white"
            stroke="white" font-size="30px"
          >
            Average: {{ meanWords }}
          </text>
        </g>
        <g class="interactive hover-text">
          <!-- maxWords -->
          <rect
            class="interactive cyan" x="99.5%" y="5"
            width="1%" height="80"
          />
          <text
            x="50%" y="180" fill="white"
            stroke="white" font-size="30px"
          >
            Maximum: {{ maxWords }}
          </text>
        </g>
      </svg>
    </div>
    <div class="box-container">
      <div class="box-left">
        Number of Markdown files: <strong>{{ mdFileCount }}</strong><br>
        Number of Code files: <strong>{{ codeFileCount }}</strong><br>
        Number of directories: <strong>{{ dirCount }}</strong><br>
        <br>
        Sum of characters in all files: <strong>{{ sumChars }}</strong><br>
        Sum of words in all files: <strong>{{ sumWords }}</strong><br>
        Standard deviation: <strong>{{ sdChars }} characters / {{ sdWords }} words</strong><br>
        <br>
        Your smallest file: <strong>{{ minChars }} characters / {{ minWords }} words</strong>
        (<a href="#" v-on:click="openFile(minCharsFile)">{{ basename(minCharsFile) }}</a>)<br>
        Your largest file: <strong>{{ maxChars }} characters / {{ maxWords }} words</strong>
        (<a href="#" v-on:click="openFile(maxCharsFile)">{{ basename(maxCharsFile) }}</a>)<br>
        The average file: <strong>{{ meanChars }} characters / {{ meanWords }} words</strong><br>
      </div>
      <div class="box-right">
        Lower bound of 68% interval (chars): <strong>{{ chars68PercentLower }}</strong><br>
        Upper bound of 68% interval (chars): <strong>{{ chars68PercentUpper }}</strong><br>
        Lower bound of 95% interval (chars): <strong>{{ chars95PercentLower }}</strong><br>
        Upper bound of 95% interval (chars): <strong>{{ chars95PercentUpper }}</strong><br>
        <br>
        Lower bound of 68% interval (words): <strong>{{ words68PercentLower }}</strong><br>
        Upper bound of 68% interval (words): <strong>{{ words68PercentUpper }}</strong><br>
        Lower bound of 95% interval (words): <strong>{{ words95PercentLower }}</strong><br>
        Upper bound of 95% interval (words): <strong>{{ words95PercentUpper }}</strong>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import localiseNumber from '@common/util/localise-number'
import { pathBasename } from '@common/util/renderer-path-polyfill'
import type { WorkspacesStatistics } from '@providers/workspaces/generate-stats'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'
import { defineComponent } from 'vue'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'FSALView',
  data: function () {
    return {
      boxPlotData: {
        width: 1400,
        height: 200,
        mean: 0,
        interval68Start: 0,
        interval68End: 0,
        interval95Start: 0,
        interval95End: 0
      },
      minWords: localiseNumber(0),
      meanWords: localiseNumber(0),
      maxWords: localiseNumber(0),
      sumWords: localiseNumber(0),
      sdWords: localiseNumber(0),

      minChars: localiseNumber(0),
      meanChars: localiseNumber(0),
      maxChars: localiseNumber(0),
      sumChars: localiseNumber(0),
      sdChars: localiseNumber(0),

      words68PercentLower: localiseNumber(0),
      words68PercentUpper: localiseNumber(0),
      words95PercentLower: localiseNumber(0),
      words95PercentUpper: localiseNumber(0),

      chars68PercentLower: localiseNumber(0),
      chars68PercentUpper: localiseNumber(0),
      chars95PercentLower: localiseNumber(0),
      chars95PercentUpper: localiseNumber(0),

      mdFileCount: localiseNumber(0),
      codeFileCount: localiseNumber(0),
      dirCount: localiseNumber(0),
      minCharsFile: '',
      maxCharsFile: '',
      minWordsFile: '',
      maxWordsFile: ''
    }
  },
  created: function () {
    ipcRenderer.invoke('application', { command: 'get-statistics-data' })
      .then((data: WorkspacesStatistics) => {
        this.recalculateStats(data)
      })
      .catch(e => console.error(e))
  },
  methods: {
    recalculateStats: function (data: WorkspacesStatistics) {
      // Approximately aspect ratio 8:1. This will be stretched and squeezed on
      // non standard compliant window sizes, but alas. We assume Zettlr will
      // -- most of the time -- be run in default maximized/full screen state on
      // landscape displays.

      // Helper function
      const zTransform = (val: number): number => {
        const percent = val / (data.maxWords - data.minWords)
        return this.boxPlotData.width * percent
      }

      // Calculate the necessary measurements for the box plot
      const ninetyFiveStart = zTransform(data.words68PercentLower)
      const ninetyFiveEnd = zTransform(data.words68PercentUpper)
      const ninetyNineStart = zTransform(data.words95PercentLower)
      const ninetyNineEnd = zTransform(data.words95PercentUpper)

      // Update the internal variables
      this.boxPlotData = {
        width: this.boxPlotData.width,
        height: this.boxPlotData.height,
        mean: zTransform(data.meanWords),
        interval68Start: ninetyFiveStart,
        interval68End: ninetyFiveEnd - ninetyFiveStart,
        interval95Start: ninetyNineStart,
        interval95End: ninetyNineEnd - ninetyNineStart
      }
      this.minWords = localiseNumber(data.minWords)
      this.meanWords = localiseNumber(data.meanWords)
      this.maxWords = localiseNumber(data.maxWords)
      this.sumWords = localiseNumber(data.sumWords)
      this.sdWords = localiseNumber(data.sdWords)
      this.minWordsFile = data.minWordsFile
      this.maxWordsFile = data.maxWordsFile

      this.minChars = localiseNumber(data.minChars)
      this.meanChars = localiseNumber(data.meanChars)
      this.maxChars = localiseNumber(data.maxChars)
      this.sumChars = localiseNumber(data.sumChars)
      this.sdChars = localiseNumber(data.sdChars)
      this.minCharsFile = data.minCharsFile
      this.maxCharsFile = data.maxCharsFile

      this.words68PercentLower = localiseNumber(data.words68PercentLower)
      this.words68PercentUpper = localiseNumber(data.words68PercentUpper)
      this.words95PercentLower = localiseNumber(data.words95PercentLower)
      this.words95PercentUpper = localiseNumber(data.words95PercentUpper)

      this.chars68PercentLower = localiseNumber(data.chars68PercentLower)
      this.chars68PercentUpper = localiseNumber(data.chars68PercentUpper)
      this.chars95PercentLower = localiseNumber(data.chars95PercentLower)
      this.chars95PercentUpper = localiseNumber(data.chars95PercentUpper)

      this.mdFileCount = localiseNumber(data.mdFileCount)
      this.codeFileCount = localiseNumber(data.codeFileCount)
      this.dirCount = localiseNumber(data.dirCount)
    },
    basename: function (absPath: string) {
      return pathBasename(absPath)
    },
    openFile: function (absPath: string) {
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: { path: absPath, newTab: true }
      } as DocumentManagerIPCAPI).catch(err => console.error(err))
    }
  }
})
</script>

<style lang="less">
div#fsal-container {
  padding: 10px;

  * {
    // Reset the default removed margin on simple p-elements etc., which is
    // currently applied in the geometry CSS.
    margin: revert;
  }

  .box-container {
    display: flex;

    .box-left, .box-right {
      width: 50%;
    }
  }
}

// Helper classes for the SVG image
#box-plot-fsal-stats-words {
  position: relative;
  width: 100%;
  // padding-top: 15%; // NOTE: This must correspond to the width and height of the SVG!

  svg#box-plot {
    background-color: #2d2d42;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  rect, path {
    transition: width 0.5s ease;
    transition: y 0.5s ease;
  }

  .interactive {
    opacity: 0.6;
    transition: opacity 0.5s ease;
  }
  .interactive:hover { opacity: 1.0; }

  .hover-text text {
    opacity: 0.0;
    transition: opacity 0.5s ease;
  }

  .hover-text:hover text { opacity: 1.0; }
  .cyan { fill: #00ffff; }
  .blue { fill: #2b7bff; }
  .navy { fill: #4517e8; }
  .magenta { fill: #ff00ff; }
}
</style>
@common/util/renderer-path-polyfill
