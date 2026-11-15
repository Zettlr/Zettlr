/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table control icons
 * License:         GNU GPL v3
 *
 * Description:     Circular controls matching the existing table plus icon.
 *
 * END HEADER
 */

// Reuse the outline from plus.svg for a consistent icon family.
const circle = 'M7.5 0C3.35786 0 0 3.35786 0 7.5C0 11.6421 3.35786 15 7.5 15C11.6421 15 15 11.6421 15 7.5C15 3.35786 11.6421 0 7.5 0Z'
const arrow = 'M7.5 3L3.5 7H6V12H9V7H11.5Z'
const row = 'M2.5 6H5.5V9H2.5ZM6 6H9V9H6ZM9.5 6H12.5V9H9.5Z'
const table = 'M4 4H7V7H4ZM8 4H11V7H8ZM4 8H7V11H4ZM8 8H11V11H8Z'

export function tableControlIcon (name: 'minus'|'up'|'down'|'left'|'right'|'row'|'column'|'table'): string {
  const rotation = name === 'down' ? 180 : name === 'left' ? 270 : name === 'right' || name === 'column' ? 90 : 0
  const cutout = name === 'minus' ? 'M3.5 6.5H11.5V8.5H3.5Z'
    : name === 'row' || name === 'column' ? row : name === 'table' ? table : arrow
  return `<svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="${circle}${cutout}" transform="rotate(${rotation} 7.5 7.5)"/></svg>`
}
