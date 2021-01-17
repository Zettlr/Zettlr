const assert = require('assert').strict

const { JSDOM } = require('jsdom');

const renderTemplate = require('../source/renderer/util/render-template')

describe('renderTemplate()', () => {
  it('can render a paragraph', () => {
    const { document } = (new JSDOM(`...`)).window;
    const template = '<p>test</p>'
    const result = renderTemplate(template, document)
    assert.strictEqual(result.textContent, 'test')
    assert.strictEqual(result.firstChild.tagName, 'P')
    assert.strictEqual(result.childElementCount, 1)
    assert.strictEqual(result.childElementCount, JSDOM.fragment(template).childElementCount)
  })

  it('can render a list', () => {
    const { document } = (new JSDOM(`...`)).window;
    const template = `
      <li>item1</li>
      <li>item2</li>
      <li>item3</li>
    `;
    const result = renderTemplate(template, document)
    assert.strictEqual(result.childElementCount, 3)
    assert.strictEqual(result.childElementCount, JSDOM.fragment(template).childElementCount)
    assert.strictEqual(result.children[0].tagName, 'LI')
    assert.strictEqual(result.children[2].textContent, 'item3')
  })
})
