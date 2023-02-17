export const FormComponents = {
  /**
   * builds a checkbox component. A property 'options' must be specified with an array of option objects.
   */
  checkbox: 'checkbox',
  /**
   * builds an input text component
   */
  text: 'text',
  /**
   * builds a select component. A property 'options' must be specified with an array of option objects.
   */
  select: 'select',
  /**
   * builds a select component where each option is a column of the table
   */
  selectColumns: 'selectColumns',

}

export const FormFieldRules = {
  /**
   * the field is required. If a required rule isn't specified, the field is treated as optional
   */
  required: 'required'
}

export const MetaToViewComponents = {
  /**
   * builds a cell containing a link
   */
  link: 'link',
  /**
   * builds a cell which can be used to create a subrow with the metadata content
   */
  sublist: 'subList',
  /**
   * builds a cell containing a tag
   */
  tag: 'tag'
}
