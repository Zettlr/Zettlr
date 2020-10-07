const TEMPLATES = require('./gui-test-configs.js')
const DIRECTORY_TEMPLATE = TEMPLATES.directory
const PROJECT_TEMPLATE = TEMPLATES.project
const SORTINGS = TEMPLATES.sortings

const path = require('path')
const fs = require('fs').promises

const TAGS = [
  '#hello', '#world', '#a-tag', '#anotherone',
  '#writing', '#efficient', '#suchtag', '#foo',
  '#bar', '#foobar', '#outofideas', '#zettlr',
  '#markdown', '#editor', '#productivity', '#charge'
]

const { LoremIpsum } = require('lorem-ipsum')
const lorem = new LoremIpsum({
  'sentencesPerParagraph': { 'max': 8, 'min': 4 },
  'wordsPerSentence': { 'max': 16, 'min': 4 }
})

function randomNumber (min, max) {
  return min + Math.floor(Math.random() * max)
}

function generateFileContents () {
  let content = ''
  for (let i = 0; i < randomNumber(0, 10); i++) {
    content += '# ' + lorem.generateSentences(1) + '\n\n'
    content += lorem.generateParagraphs(randomNumber(1, 4))
    content += '\n\n'
  }

  // Add some tags
  for (let j = 0; j < randomNumber(0, 3); j++) {
    content += TAGS[randomNumber(0, TAGS.length)]
  }

  // Return that thing
  return content
}

function generateProject () {
  let content = JSON.parse(JSON.stringify(PROJECT_TEMPLATE))
  // We'll leave the projects at default for now ...
  return content
}

function generateZtrDirectoryFile () {
  let content = JSON.parse(JSON.stringify(DIRECTORY_TEMPLATE))
  content.sorting = SORTINGS[randomNumber(0, SORTINGS.length)]
  if (randomNumber(0, 10) > 8) {
    // 20% chance to generate a project
    content.project = generateProject()
  }
  return JSON.stringify(content)
}

const DIRECTORY_STRUCTURE = [
  {
    'name': lorem.generateWords(4),
    'type': 'directory',
    'children': [
      {
        'name': lorem.generateWords(4) + '.md',
        'type': 'file',
        'content': generateFileContents()
      },
      {
        'name': lorem.generateWords(4) + '.md',
        'type': 'file',
        'content': generateFileContents()
      }
    ]
  },
  // Two
  {
    'name': lorem.generateWords(4),
    'type': 'directory',
    'children': [
      {
        'name': lorem.generateWords(4) + '.md',
        'type': 'file',
        'content': generateFileContents()
      },
      {
        'name': lorem.generateWords(4) + '.md',
        'type': 'file',
        'content': generateFileContents()
      },
      // This one has a ztr directory
      {
        'name': '.ztr-directory',
        'type': 'file',
        'content': generateZtrDirectoryFile()
      }
    ]
  },
  // Three
  {
    'name': lorem.generateWords(4),
    'type': 'directory',
    'children': [
      {
        'name': lorem.generateWords(4) + '.md',
        'type': 'file',
        'content': generateFileContents()
      },
      {
        'name': lorem.generateWords(4) + '.md',
        'type': 'file',
        'content': generateFileContents()
      },
      {
        'name': lorem.generateWords(4),
        'type': 'directory',
        'children': [
          {
            'name': lorem.generateWords(4) + '.md',
            'type': 'file',
            'content': generateFileContents()
          },
          {
            'name': lorem.generateWords(4) + '.md',
            'type': 'file',
            'content': generateFileContents()
          }
        ]
      },
      // This one has a ztr directory
      {
        'name': '.ztr-directory',
        'type': 'file',
        'content': generateZtrDirectoryFile()
      }
    ]
  },
  // Four
  {
    'name': lorem.generateWords(4) + '.md',
    'type': 'file',
    'content': generateFileContents()
  }
]

/**
 * Recursively populates a directory tree.
 * @param {String} basePath The base path
 * @param {Array} dirs An array of files and dirs to create
 */
async function createDirectories (basePath, dirs) {
  for (let root of dirs) {
    if (root.type === 'directory') {
      await fs.mkdir(path.join(basePath, root.name))
      if (root.children && root.children.length > 0) {
        await createDirectories(path.join(basePath, root.name), root.children)
      }
    } else {
      await fs.writeFile(path.join(basePath, root.name), root.content)
    }
  }
}

module.exports = async function () {
  // This function generates a directory structure for testing purposes
  await createDirectories(path.join(__dirname, '../../resources/test'), DIRECTORY_STRUCTURE)
  return DIRECTORY_STRUCTURE.map(e => path.join(__dirname, '../../resources/test', e.name))
}
