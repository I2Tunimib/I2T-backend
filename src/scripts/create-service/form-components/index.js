import { checkbox, option } from "./checkbox.js";
import { field } from "./field.js";
import { form } from "./form.js";
import { input } from "./input.js";
import { selectColumns } from "./selectColumns.js";
import { FieldRules } from "./rules.js.js";
import util from 'util';


export const FieldRules = {
  required: 'required'
}

export const FormComponents = {
  form: form,
  field: field,
  option: option,
}

export const FormInputTypes = {
  checkbox: checkbox,
  input: input,
  selectColumns: selectColumns
}

const f = FormComponents.form([
  FormComponents.field({
    id: 'id',
    description: 'description',
    label: 'label',
    rules: [FieldRules.required]
  }, FormComponents.checkbox([
    FormComponents.option({ id: '1', label: '1', value: '1' }),
    FormComponents.option({ id: '2', label: '2', value: '2' })
  ])),
  FormComponents.field({
    id: 'id',
    description: 'description',
    label: 'label',
    rules: [FieldRules.required]
  }, FormComponents.input({ defaultValue: 'test' }))
])




console.log(util.inspect(f, false, null, true /* enable colors */))