// Log viewer window entry file

const { ipcRenderer } = require('electron')

const LOG_LEVEL_VERBOSE = 1
const LOG_LEVEL_INFO = 2
const LOG_LEVEL_WARNING = 3
const LOG_LEVEL_ERROR = 4

function hasDetails (detailObject) {
  if (!detailObject) return false

  if (typeof detailObject === 'object') {
    return Object.keys(detailObject).length > 0
  }

  if (Array.isArray(detailObject) || typeof detailObject === 'string') {
    return detailObject.length > 0
  }

  return true
}

function parseDetails (detail) {
  let ret = ''
  if (typeof detail === 'object') {
    for (let param of Object.keys(detail)) {
      let val = (typeof detail[param] === 'object') ? JSON.stringify(detail[param]) : detail[param] + ''
      if (val.length > 1000) val = val.substr(0, 1000) + '&hellip; <span class="more">(' + (val.length - 1000) + ' more characters)</span>'
      ret += `${param}: ${val}<br>`
    }
  } else if (Array.isArray(detail)) {
    for (let i = 0; i < detail.length; i++) {
      let val = (typeof detail[i] === 'object') ? JSON.stringify(detail[i]) : detail[i] + ''
      if (val.length > 1000) val = val.substr(0, 1000) + '&hellip; <span class="more">(' + (val.length - 1000) + ' more characters)</span>'
      ret += `[${i}]: ${val}`
    }
  } else {
    ret += `${detail}<br>`
  }
  return ret
}

function addLogs (logs) {
  let elem = document.getElementById('app')
  let shouldScrollDown = (window.innerHeight + window.scrollY === document.body.offsetHeight)
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

    let details = document.createElement('div')
    details.classList.add('details')
    details.classList.add('hidden')
    if (hasDetails(entry.details)) {
      let detailButton = document.createElement('div')
      detailButton.classList.add('expand-details')
      message.appendChild(detailButton)
      details.innerHTML = parseDetails(entry.details)
      message.appendChild(details)
    }

    div.appendChild(time)
    div.appendChild(message)
    // Finally append to the elem
    elem.appendChild(div)

    // Scroll if necessary
    if (shouldScrollDown) {
      window.scrollTo(0, document.body.offsetHeight - window.innerHeight)
    }
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

  document.getElementById('app').addEventListener('click', (evt) => {
    // Whenever the user clicks on any message, toggle the details
    let messageParent = evt.target.closest('.message')
    if (messageParent) {
      evt.stopPropagation()
      evt.preventDefault()
      let details = messageParent.getElementsByClassName('details')[0]
      if (details) details.classList.toggle('hidden')
    }
  })
}
