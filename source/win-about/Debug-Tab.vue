<template>
  <div id="debug-tab">
    <p>
      This page contains internal debug information for this installation of
      Zettlr.
    </p>
    <h2>General Information</h2>
    <p>Zettlr Version: <strong>{{ version }}</strong> (UUID: {{ uuid }})</p>
    <p>
      System: <strong>{{ platform }} {{ platformVersion }}</strong>
      (architecture: {{ arch }})
    </p>
    <h2>Build Dependencies</h2>
    <p>
      This build was compiled using
      <ul>
        <li>Node.js <strong>v{{ versions.node }}</strong></li>
        <li>Electron <strong>v{{ versions.electron }}</strong></li>
        <li>Chrome <strong>v{{ versions.chrome }}</strong></li>
        <li>v8 engine <strong>v{{ versions.v8 }}</strong></li>
        <li>Zlib <strong>v{{ versions.zlib }}</strong></li>
        <li>OpenSSL <strong>v{{ versions.openssl }}</strong></li>
      </ul>
    </p>
    <h2>Current System Load</h2>
    <ul>
      <li>
        CPU Load:
        <strong><span id="realtime-cpu-load">{{ cpu }}</span>%</strong>
      </li>
      <li>
        Resident Set Size:
        <strong><span id="realtime-rss">{{ memoryRss }}</span></strong> MB
      </li>
      <li>
        C++ memory for JS Objects:
        <strong><span id="realtime-external">{{ memoryExternal }}</span></strong> MB
      </li>
      <li>
        Heap:
        <strong><span id="realtime-heap-used">{{ heapUsed }}</span></strong>
        from
        <strong><span id="realtime-heap-total">{{ heapTotal }}</span></strong> MB
        (Limit: <strong>{{ heapLimit }}</strong> MB)
      </li>
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

<script>
/**
 * Rounds an integer to the specified amount of floating points.
 *
 * @param {number} num The number to be rounded.
 * @param {number} amount The number of floating point digits to retain.
 * @returns {number}
 */
function roundDec (num, amount) {
  let exp = Math.pow(10, amount)
  return Math.round(num * exp) / exp
}

export default {
  name: 'DebugTab',
  data: function () {
    return {
      version: global.config.get('version'),
      uuid: global.config.get('uuid'),
      versions: JSON.parse(JSON.stringify(process.versions)),
      argv: JSON.parse(JSON.stringify(process.argv)),
      arch: process.arch,
      env: Object.assign({}, process.env),
      platform: process.platform,
      platformVersion: process.getSystemVersion(),
      uptime: Math.floor(process.uptime()), // seconds
      memoryRss: 0,
      memoryExternal: 0,
      cpu: 0,
      heapTotal: 0,
      heapUsed: 0,
      heapLimit: 0
    }
  },
  created: function () {
    setInterval(() => {
      this.refresh()
    }, 1000)
  },
  methods: {
    refresh: function () {
      const memory = process.memoryUsage()
      const heap = process.getHeapStatistics()
      this.memoryRss = roundDec(memory.rss / 1000000, 2)
      this.memoryExternal = roundDec(memory.external / 1000000, 2)
      this.heapUsed = roundDec(heap.usedHeapSize / 1000, 2)
      this.heapTotal = roundDec(heap.totalHeapSize / 1000, 2)
      this.cpu = roundDec(process.getCPUUsage().percentCPUUsage, 2)
    }
  }
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
