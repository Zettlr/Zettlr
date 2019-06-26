/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrValidation class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Instantiate an object of type ZettlrValidation to ensure that
 *                  a given user input is valid.
 *
 * END HEADER
 */

const { trans } = require('../common/lang/i18n')

class ZettlrValidation {
  /**
   * Create a validation ruleset.
   * @param {string} option  The key/option that can be validated with this ruleset.
   * @param {string} ruleset The unparsed ruleset, e.g. "required|min:4|max:5|string"
   */
  constructor (option, ruleset) {
    this._isValidated = false
    this._option = option // The option this ruleset can validate

    // Rule requirements
    this._isRequired = undefined
    this._type = undefined
    this._min = undefined
    this._max = undefined
    this._in = undefined
    this._isEmpty = undefined

    // Parse it!
    this._parseRules(ruleset)
  }

  /**
   * Parses the rules and prepares the validation of a value.
   * @param  {string} rules The rulset provided to the constructor.
   * @return {void}       There's nothing to return.
   */
  _parseRules (rules) {
    if (typeof rules !== 'string') throw Error('Ruleset was not a string!')

    let set = []

    if (rules.length === 0) console.warn('Ruleset is empty, no validation will take place!')
    if (rules.indexOf('|') > -1) {
      // We've got multiple rules
      set = rules.split('|')
    } else {
      set.push(rules)
    }

    // Now split all rules themselves based upon colons and commas.
    for (let i = 0; i < set.length; i++) {
      if (set[i].indexOf(':') > -1) {
        set[i] = set[i].split(':')
        // Optional, split the value of the key:value pair.
        if (set[i][1].indexOf(',') > -1) {
          set[i][1].split(',')
        }
      }
    }

    // Now parse all rules and set the respective parameters of this object.
    for (let rule of set) {
      // We either have a "standalone" rule (such as the var type) or key:value rules.
      let key = (Array.isArray(rule)) ? rule[0] : rule
      switch (key) {
        // Required?
        case 'required':
          this._isRequired = true
          break
        case 'optional':
          this._isRequired = false
          break
        // Types
        case 'boolean':
          this._type = 'boolean'
          break
        case 'string':
          this._type = 'string'
          break
        case 'number':
          this._type = 'number'
          break
        case 'array':
          this._type = 'array'
          break
        // Ranges
        case 'min':
          if (!rule[1] || rule[1].length === 0) throw Error('Found min-rule, but no value!')
          this._min = parseInt(rule[1])
          break
        case 'max':
          if (!rule[1] || rule[1].length === 0) throw Error('Found max-rule, but no value!')
          this._max = parseInt(rule[1])
          break
        // Predefined values
        case 'in':
          if (!rule[1] || rule[1].length === 0) throw Error('Found in-rule, but no value!')
          this._in = rule[1].split(',')
          break
        // Assigned default value
        case 'default':
          this._default = rule[1] // Default values may very well be empty.
          break
      }

      // Now the rules are parsed.
    }
  }

  /**
   * Validates an input and returns a boolean indicating the result.
   * @param  {Mixed} input The input to be checked.
   * @return {Boolean}       True, if the input passes the validation, or false.
   */
  validate (input) {
    this._input = input
    // Now we validate the input.
    let error = false
    // Is a string with minimum and/or maximum characters passing the requirement?
    if (!this.isInRange()) error = true
    if (!this.isTypeCorrect()) error = true
    if (!this.isValueCorrect()) error = true

    // Afterwards validate
    if (!this.isRequired() && this.isEmpty()) {
      // This input is optional and empty, so it's true.
      this._isValidated = true
    } else if (this.isRequired() && this.isEmpty()) {
      // This input is required and is empty, so it's false.
      this._isValidated = false
    } else {
      // Set the validation status to the error value.
      this._isValidated = !error
    }

    return this.isValid()
  }

  /**
   * Returns whether or not the last given input has been successfully validated.
   * @return {Boolean} Whether or not the last input was valid.
   */
  isValid () { return this._isValidated }

  /**
   * Returns whether this option is required.
   * @return {Boolean} True, if the option is required, false if not.
   */
  isRequired () {
    if (this._isRequired === undefined) return false
    return this._isRequired
  }

  /**
   * Returns whether or not the last given input was empty.
   * @return {Boolean} True, if the input was empty, or false.
   */
  isEmpty () {
    let empty = false
    if (typeof this._input === 'string' && this._input.length === 0) empty = true
    if (Array.isArray(this._input) && this._input.length === 0) empty = true
    if (this._input == null) empty = true
    return empty
  }

  /**
   * Returns whether or not the input meets the min/max criteria of the ruleset.
   * @return {Boolean} Returns false, if one of the range criteria were not met, otherwise true.
   */
  isInRange () {
    if (this._min === undefined && this._max === undefined) return true
    let pass = true
    // Is a string in range?
    if (typeof this._input === 'string' && this._min && this._input.length < this._min) pass = false
    if (typeof this._input === 'string' && this._max && this._input.length > this._max) pass = false
    // Is a number in range?
    if (typeof this._input === 'number' && this._min && this._input < this._min) pass = false
    if (typeof this._input === 'number' && this._max && this._input > this._max) pass = false
    // Is an array in range?
    if (Array.isArray(this._input) && this._min && this._input.length < this._min) pass = false
    if (Array.isArray(this._input) && this._max && this._input.length > this._max) pass = false
    return pass
  }

  /**
   * Returns whether or not the type of the last given input is correct.
   * @return {Boolean} True, if the type matches the criteria, or false.
   */
  isTypeCorrect () {
    if (this._type === undefined) return true
    if (this._type === 'array') return Array.isArray(this._input)
    if (this._type === 'string') return typeof this._input === 'string'
    if (this._type === 'number') return typeof this._input === 'number'
    if (this._type === 'boolean') return typeof this._input === 'boolean'
  }

  /**
   * Returns whether or not the provided input is included in the predefined keys.
   * @return {Boolean} True, if the given value has been mentioned in the "in:"-criterium
   */
  isValueCorrect () {
    if (this._in === undefined) return true

    // includes() returns false if the types don't match. We allow for this here.
    if (this._type !== 'string') return this._in.includes(`${this._input}`)
    return this._in.includes(this._input)
  }

  /**
   * Returns a message explaining why the last validation failed, or an empty string.
   * @return {string} A fully parsed and translated string indicating the first violated rule.
   */
  why () {
    // Returns a message explaining why the validation failed.
    if (!this.isTypeCorrect()) return trans('validation.error_type', this._option, this._type)
    if (!this.isValueCorrect()) return trans('validation.error_value', this._option, this._in.join(', '))
    if (!this.isInRange() && this._min && this._max) return trans('validation.error_range_both', this._option, this._min, this._max)
    if (!this.isInRange() && !this._min && this._max) return trans('validation.error_range_max', this._option, this._max)
    if (!this.isInRange() && this._min && !this._max) return trans('validation.error_range_min', this._option, this._min)
    if (this.isEmpty() && this.isRequired()) return trans('validation.error_empty', this._option)
    return '' // Failsafe
  }

  /**
   * Returns the default value that inputs for this rule should have, if any.
   * @return {[type]} [description]
   */
  getDefault () { return this._default }

  /**
   * Returns the key for which this rule is made.
   * @return {string} The key.
   */
  getKey () { return this._option }
}

module.exports = ZettlrValidation
