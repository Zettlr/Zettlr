// This script provides functions to generate coloured output.

import chalk from 'chalk'

export function error (message) { console.error(chalk.bold.red(message)) }
export function warn (message) { console.warn(chalk.yellow(message)) }
export function info (message) { console.log(chalk.blueBright(message)) }
export function verbose (message) { console.log(chalk.grey(message)) }
export function success (message) { console.log(chalk.green(message)) }
