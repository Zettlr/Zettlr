/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Config validation functionality
 * CVM-Role:        Module
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains the functions required for option validation
 *
 * END HEADER
 */

import { trans } from '@common/i18n-main'

const RULES = {
  darkMode: 'required|boolean|default:false',
  autoDarkMode: 'required|string|in:off,system,schedule,auto|default:off',
  fileMeta: 'required|boolean|default:true',
  sorting: 'required|string|in:natural,ascii|default:natural',
  newFileNamePattern: 'required|string|default:%id.md',
  appLang: 'required|string|min:5|max:7|default:en_US',
  fileManagerMode: 'required|string|in:thin,expanded,combined|default:thin',
  muteLines: 'required|boolean|default:false',
  'export.dir': 'required|string|in:temp,cwd|default:temp',
  'export.stripTags': 'required|boolean|default:false',
  'export.stripLinks': 'required|string|in:full,unlink,no|default:full',
  'zkn.idRE': 'required|string|default:',
  'zkn.idGen': 'required|string|min:2|default:',
  attachmentExtensions: 'optional|array',
  debug: 'required|boolean|default:false',
  title: 'required|string|default:',
  'editor.indentUnit': 'required|number|min:1|max:24',
  'editor.boldFormatting': 'required|string|in:__,**|default:**',
  'editor.italicFormatting': 'required|string|in:_,*|default:_',
  'editor.readabilityAlgorithm': 'required|string|in:dale-chall,gunning-fog,coleman-liau,automated-readability|default:dale-chall',
  cslLibrary: 'optional|string|default:',
  'display.imageWidth': 'required|number|min:1|max:100|default:100',
  'display.imageHeight': 'required|number|min:1|max:100|default:100',
  'watchdog.stabilityThreshold': 'optional|number|min:1|max:100000|default:1000'
}

export const VALIDATE_RULES = Object.values(RULES)
export const VALIDATE_PROPERTIES = Object.keys(RULES)

interface ValidationError {
  key: string
  reason: string
}

export function validate (data: any): ValidationError[] {
  // Validate the given form data.
  if (data === undefined) {
    throw new Error('No data given!')
  }

  const unvalidated: ValidationError[] = []
  for (const key in data) {
    if (VALIDATE_PROPERTIES.includes(key)) {
      const rule = VALIDATE_RULES[VALIDATE_PROPERTIES.indexOf(key)]
      const val = new ValidationRule(key, rule)
      if (!val.validate(data[key])) {
        unvalidated.push({ key, reason: val.why() })
      }
    }
  }
  return unvalidated
}

export class ValidationRule {
  private _input: any
  private readonly _option: string
  private readonly _isRequired: boolean
  private readonly _type: any
  private readonly _min: undefined|number
  private readonly _max: undefined|number
  private readonly _in: undefined|any
  private readonly _default: string|undefined
  /**
   * Create a validation ruleset.
   * @param {string} option  The key/option that can be validated with this ruleset.
   * @param {string} ruleset The unparsed ruleset, e.g. "required|min:4|max:5|string"
   */
  constructor (option: string, ruleset: string) {
    this._option = option // The option this ruleset can validate

    // Rule requirements
    this._isRequired = false
    this._type = undefined
    this._min = undefined
    this._max = undefined
    this._in = undefined

    // Parse it!
    if (typeof ruleset !== 'string') {
      throw Error('Ruleset was not a string!')
    }

    if (ruleset.length === 0) {
      console.warn('Ruleset is empty, no validation will take place!')
    }

    const set: string[] = []

    if (ruleset.includes('|')) {
      // We've got multiple rules
      set.push(...ruleset.split('|'))
    } else {
      set.push(ruleset)
    }

    // Now parse all rules and set the respective parameters of this object.
    for (const rule of set) {
      if (rule === 'required') {
        this._isRequired = true
      } else if (rule === 'optional') {
        this._isRequired = false
      } else if ([ 'boolean', 'string', 'number', 'array' ].includes(rule)) {
        this._type = rule
      } else if (rule.startsWith('min:')) {
        const minValue = rule.split(':')[1]
        if (minValue.trim() === '') {
          throw new Error('Found min-rule, but no value!')
        }
        this._min = parseInt(minValue, 10)
      } else if (rule.startsWith('max:')) {
        const maxValue = rule.split(':')[1]
        if (maxValue.trim() === '') {
          throw new Error('Found max-rule, but no value!')
        }
        this._max = parseInt(maxValue, 10)
      } else if (rule.startsWith('in:')) {
        const inValue = rule.split(':')[1]

        if (inValue.trim() === '') {
          throw new Error('Found in-rule, but no value!')
        }

        this._in = inValue.split(',')
      } else if (rule.startsWith('default:')) {
        this._default = rule.split(':')[1]
      }
    }
  }

  /**
   * Validates an input and returns a boolean indicating the result.
   * @param  {any} input The input to be checked.
   * @return {boolean}       True, if the input passes the validation, or false.
   */
  validate (input: any): boolean {
    let isValidated = false
    this._input = input

    // Now we validate the input.
    let error = false
    // Is a string with minimum and/or maximum characters passing the requirement?
    if (!this.isInRange()) {
      error = true
    }
    if (!this.isTypeCorrect()) {
      error = true
    }
    if (!this.isValueCorrect()) {
      error = true
    }

    // Afterwards validate
    if (!this.isRequired() && this.isEmpty()) {
      // This input is optional and empty, so it's true.
      isValidated = true
    } else if (this.isRequired() && this.isEmpty()) {
      // This input is required and is empty, so it's false.
      isValidated = false
    } else {
      // Set the validation status to the error value.
      isValidated = !error
    }

    return isValidated
  }

  /**
   * Returns whether this option is required.
   * @return {Boolean} True, if the option is required, false if not.
   */
  isRequired (): boolean {
    return this._isRequired
  }

  /**
   * Returns whether or not the last given input was empty.
   * @return {Boolean} True, if the input was empty, or false.
   */
  isEmpty (): boolean {
    if (typeof this._input === 'string' && this._input.length === 0) {
      return true
    }
    if (Array.isArray(this._input) && this._input.length === 0) {
      return true
    }
    if (this._input == null) {
      return true
    }
    return false
  }

  /**
   * Returns whether or not the input meets the min/max criteria of the ruleset.
   * @return {Boolean} Returns false, if one of the range criteria were not met, otherwise true.
   */
  isInRange (): boolean {
    if (this._min === undefined && this._max === undefined) {
      return true
    }
    // Is a string in range?
    if (typeof this._input === 'string' && this._min !== undefined && this._input.length < this._min) {
      return false
    }
    if (typeof this._input === 'string' && this._max !== undefined && this._input.length > this._max) {
      return false
    }
    // Is a number in range?
    if (typeof this._input === 'number' && this._min !== undefined && this._input < this._min) {
      return false
    }
    if (typeof this._input === 'number' && this._max !== undefined && this._input > this._max) {
      return false
    }
    // Is an array in range?
    if (Array.isArray(this._input) && this._min !== undefined && this._input.length < this._min) {
      return false
    }
    if (Array.isArray(this._input) && this._max !== undefined && this._input.length > this._max) {
      return false
    }
    return true
  }

  /**
   * Returns whether or not the type of the last given input is correct.
   * @return {Boolean} True, if the type matches the criteria, or false.
   */
  isTypeCorrect (): boolean {
    if (this._type === undefined) {
      return true
    } else if (this._type === 'array') {
      return Array.isArray(this._input)
    } else {
      return typeof this._input === this._type
    }
  }

  /**
   * Returns whether or not the provided input is included in the predefined keys.
   * @return {Boolean} True, if the given value has been mentioned in the "in:"-criterium
   */
  isValueCorrect (): boolean {
    if (this._in === undefined) {
      return true
    } else if (this._type !== 'string') {
      // includes() returns false if the types don't match. We allow for this here.
      return this._in.includes(String(this._input))
    } else {
      return this._in.includes(this._input)
    }
  }

  /**
   * Returns a message explaining why the last validation failed, or an empty string.
   * @return {string} A fully parsed and translated string indicating the first violated rule.
   */
  why (): string {
    // Returns a message explaining why the validation failed.
    if (!this.isTypeCorrect()) {
      return trans('Option %s has to be of type %s.', this._option, this._type)
    }
    if (!this.isValueCorrect()) {
      return trans('Option %s must be one of: %s.', this._option, this._in.join(', '))
    }
    if (!this.isInRange() && this._min !== undefined && this._max !== undefined) {
      return trans('Option %s must be between %s and %s (characters long).', this._option, this._min, this._max)
    }
    if (!this.isInRange() && this._min === undefined && this._max !== undefined) {
      return trans('Option %s may not exceed %s (characters).', this._option, this._max)
    }
    if (!this.isInRange() && this._min !== undefined && this._max === undefined) {
      return trans('Option %s must be at least %s (characters long).', this._option, this._min)
    }
    if (this.isEmpty() && this.isRequired()) {
      return trans('Option %s is required.', this._option)
    }
    return '' // Failsafe
  }

  /**
   * Returns the default value that inputs for this rule should have, if any.
   * @return {[type]} [description]
   */
  getDefault (): string|undefined {
    return this._default
  }

  /**
   * Returns the key for which this rule is made.
   * @return {string} The key.
   */
  getKey (): string {
    return this._option
  }
}
