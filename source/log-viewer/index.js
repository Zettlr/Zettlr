// Log viewer window entry file

const { ipcRenderer } = require('electron')

const LOG_LEVEL_VERBOSE = 1
const LOG_LEVEL_INFO = 2
const LOG_LEVEL_WARNING = 3
const LOG_LEVEL_ERROR = 4

function addLogs (logs) {
  let elem = document.getElementById('app')
  for (let entry of logs) {
    let div = document.createElement('div')
    div.classList.add('message')
    switch (entry.level) {
      case LOG_LEVEL_VERBOSE:
        div.classList.add('verbose')
        break
      case LOG_LEVEL_INFO:
        div.classList.add('info')
        break
      case LOG_LEVEL_WARNING:
        div.classList.add('warning')
        break
      case LOG_LEVEL_ERROR:
        div.classList.add('error')
        break
    }

    // Prepare the message
    let time = document.createElement('div')
    time.classList.add('timestamp')
    time.innerText = (entry.hasOwnProperty('time')) ? `[${entry.time}]` : ''
    let message = document.createElement('div')
    message.classList.add('msg')
    message.innerText = entry.message
    div.appendChild(time)
    div.appendChild(message)
    // FInally append to the elem
    elem.appendChild(div)
  }
}

window.onload = () => {
  ipcRenderer.on('log-view-add', (event, message) => {
    // Content contains one message
    addLogs([message])
  })

  ipcRenderer.on('log-view-reload', (event, logs) => {
    // Content contains all messages
    document.getElementById('app').innerHTML = '' // Reset
    addLogs(logs)
  })
}
