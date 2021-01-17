// This script provides functions to generate coloured output.

const chalk = require('chalk')

module.exports = {
  error: function (message) { console.error(chalk.bold.red(message)) },
  warn: function (message) { console.warn(chalk.yellow(message)) },
  info: function (message) { console.log(chalk.keyword('cornflowerblue')(message)) },
  verbose: function (message) { console.log(chalk.grey(message)) },
  success: function (message) { console.log(chalk.green(message)) }
}
