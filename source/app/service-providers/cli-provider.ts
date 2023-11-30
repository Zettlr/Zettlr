/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        cli-provider class
 * CVM-Role:        Service Provider
 * Authorr:         Felix Nüsse
 * License:         GNU GPL v3
 *
 * Description:     This class handles the cli-arguments.
 *                  It can be used to query arguments, as
 *                  long as they are defined in the options object.
 *
 * END HEADER
 */

import { app } from 'electron'

export const DATA_DIR = 'data-dir'
export const DISABLE_HARDWARE_ACCELERATION = 'disable-hardware-acceleration'
export const CLEAR_CACHE = 'clear-cache'
export const LAUNCH_MINIMIZED = 'launch-minimized'

/**
 * This function returns whether or not a predefined argument was passed to the zettlr executable.
 * Possible keys:
 *    data-dir,
 *    disable-hardware-acceleration,
 *    clear-cache,
 *    launch-minimized
 *
 * Please use the defined constants instead of raw values!
 *
 * @param key  {string}   This is the key to be checked.
 *
 * @return  {string}      If the key is of the format -x=y, --xlong=y, a string with y is returned (If it was predefined)
 * @return  {boolean}     If the key is of the format -x, --xlong, a boolean is returned. True if it was passed, false if not  (If it was predefined)
 * @return  {undefined}   If the key is not predefined, this function returns undefined
 */
export function getCLIArgument (key: string): string | boolean | undefined {
  switch (key) {
    case DATA_DIR: {
      return getArgumentValue('--data-dir')
    }
    case CLEAR_CACHE: {
      return process.argv.includes('--clear-cache')
    }
    case DISABLE_HARDWARE_ACCELERATION: {
      return process.argv.includes('--disable-hardware-acceleration')
    }
    case LAUNCH_MINIMIZED: {
      return process.argv.includes('--launch-minimized') || process.argv.includes('-m')
    }
  }
  return undefined
}

/**
 * This function scans the provided arguments to see if there is an argument,
 * such as `--help` or `--version`, after which the app should quit instead of
 * continuing to boot.
 *
 * NOTE: Ensure this function runs as early as possible, since the app will exit
 * afterwards.
 */
export function handleExitArguments (): void {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp()
    process.exit()
  }

  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log(app.getName() + ' ' + app.getVersion())
    process.exit()
  }
}

/**
 * Print a small CLI help on stdout.
 */
function showHelp (): void {
  console.log(`usage: ${app.getName()} [option] [files...]`)
  console.log('Options and arguments:')
  console.log('-h  --help                            Show this help and exit')
  console.log('-v  --version                         Show the version string and exit')
  console.log('    --clear-cache                     Clears the FSAL cache upon startup')
  console.log('    --disable-hardware-acceleration   Disables hardware acceleration')
  console.log('    --data-dir=FILEPATH               Use FILEPATH as the appData directory')
  console.log('-m  --launch-minimized                Start Zettlr mimimized to the tray/menu bar')
}

/**
 * This allows to get a raw, unprocessed value for any argument passed via ClI.
 * The passed argument has to be either of the format -x=y or --xlong=y.
 *
 * @param key  {string}   This is the key to be checked. OMIT the equals sign, eg. -x or --xlong; NOT -x=y.
 *
 * @return  {string}      If the key is of the format -x=y, --xlong=y, a string with y is returned
 * @return  {undefined}   If the key was not passed or is not of the format specified in the description.
 */
export function getArgumentValue (key: string): string | undefined {
  const argument = process.argv.find(elem => elem.indexOf(key + '=') === 0)
  if (argument === undefined) {
    return undefined
  }

  const match = /="?([^"]+)"?$/.exec(argument)
  if (match !== null) {
    return match[1]
  }
}
