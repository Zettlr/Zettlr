module.exports = {
  renderTemplate: (templateString) => {
    const template = document.createElement('template')
    template.innerHTML = templateString
    return template.content.cloneNode(true)
  }
}
