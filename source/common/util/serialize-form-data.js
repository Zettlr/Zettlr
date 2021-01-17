/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Utility Function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This utility function serializes form data into objects
 *                  with name/value-pairs, and returns all in an array. This
 *                  mimicks the functionality of jQuery(form).serializeArray().
 *
 * END HEADER
 */

/**
 * Helper function to serialize form elements the same way jQuery
 * does it with its serializeArray() function.
 *
 * @param   {HTMLFormElement}  formElement  The form to serialize
 *
 * @return  {Object[]}               The serialized data as objects with name/value properties
 */
module.exports = function (formElement) {
  let data = []
  const formData = new FormData(formElement)
  for (const element of formData.entries()) {
    data.push({
      'name': element[0],
      'value': element[1]
    })
  }

  return data
}
