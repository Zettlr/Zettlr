<template>
  <div id="debug-tab">
    <p>
      This page contains internal debug information for this installation of
      Zettlr.
    </p>
    <h2>General Information</h2>
    <ul>
      <li>Zettlr Version: <strong>{{ configStore.config.version }}</strong></li>
      <li>Build number: <strong><code>{{ commit }}</code></strong> ({{ buildDate }})</li>
      <li>UUID: <strong><code>{{ configStore.config.uuid }}</code></strong></li>
      <li>
        System: <strong>{{ platform }} {{ platformVersion }}</strong>
        (architecture: {{ arch }})
      </li>
    </ul>
    <h2>Build Dependencies</h2>
    <p>
      This build was compiled using:
    </p>
    <ul>
      <li>Node.js <strong>v{{ versions.node }}</strong></li>
      <li>Electron <strong>v{{ versions.electron }}</strong></li>
      <li>Chrome <strong>v{{ versions.chrome }}</strong></li>
      <li>v8 engine <strong>v{{ versions.v8 }}</strong></li>
      <li>Zlib <strong>v{{ versions.zlib }}</strong></li>
      <li>OpenSSL <strong>v{{ versions.openssl }}</strong></li>
    </ul>
    <h2>Helper programs</h2>
    <ul>
      <li>Pandoc: <strong>{{ programVersions.pandoc }}</strong></li>
      <li>Quarto: <strong>{{ programVersions.quarto }}</strong></li>
      <li>Git SVN: <strong>{{ programVersions.git }}</strong></li>
    </ul>
    <h2>Renderer flags</h2>
    <ul>
      <li v-for="(arg, idx) in argv" v-bind:key="idx">
        {{ arg }}
      </li>
    </ul>
    <h2>Environment Variables</h2>
    <ul>
      <li v-for="(key, value, idx) in env" v-bind:key="idx">
        <strong>{{ value }}</strong>: {{ key }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { useConfigStore } from 'source/pinia'

/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DebugTab
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the debug tab for the about window.
 *
 * END HEADER
 */

const configStore = useConfigStore()

const versions = process.versions
const argv = process.argv
const arch = process.arch
const env = Object.assign({}, process.env)
const platform = process.platform
const commit = __GIT_COMMIT_HASH__
const buildDate = DateTime.fromISO(__BUILD_DATE__).toLocaleString({ dateStyle: 'full' })
// DEBUG: getSystemVersion is a simple property in the renderer, not a function
const platformVersion = process.getSystemVersion as unknown as string
// Add version strings for external helper programs Zettlr can use
const programVersions = {
  pandoc: process.env.PANDOC_VERSION ?? 'not available',
  quarto: process.env.QUARTO_VERSION ?? 'not available',
  git: process.env.GIT_VERSION ?? 'not available'
}
</script>

<style lang="less">
div#debug-tab {
  user-select: text;
  * {
    margin: revert;
  }
}
</style>
