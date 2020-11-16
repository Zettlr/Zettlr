/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A utility function that resolves a timespan in milliseconds
 *                  to an object containing the right amount of ms, seconds,
 *                  minutes, hours, days, and weeks.
 *
 * END HEADER
 */

interface Timespan {
  ms: number
  seconds: number
  minutes: number
  hours: number
  days: number
  weeks: number
}

/**
 * This function resolves a span in milliseconds into an object containing
 * seconds, minutes, hours, days, weeks.
 *
 * @param   {number}  ms  The time span to resolve
 *
 * @return  {Timespan}    The resolved Timespan object
 */
export default function resolveTimespanMs (ms: number): Timespan {
  let seconds: number = Math.floor(ms / 1_000) // Seconds
  let minutes: number = 0
  let hours: number = 0
  let days: number = 0
  let weeks: number = 0

  if (ms > 1000) {
    ms = ms % 1_000
  }

  if (seconds > 60) {
    minutes = Math.floor(seconds / 60)
    seconds = seconds % 60
  }

  if (minutes > 60) {
    hours = Math.floor(minutes / 60)
    minutes = minutes % 60
  }

  if (hours > 24) {
    days = Math.floor(hours / 60)
    hours = hours % 24
  }

  if (days > 7) {
    weeks = Math.floor(days / 7)
    days = days % 7
  }

  return { ms, seconds, minutes, hours, days, weeks }
}
