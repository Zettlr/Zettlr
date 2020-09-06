module.exports = {
  renderTemplate: (templateString, dom = document) => {
    const template = dom.createElement('template')
    template.innerHTML = templateString
    return template.content.cloneNode(true)
  }
}
