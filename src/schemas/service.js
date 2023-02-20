import { z } from 'zod';
import { FormComponents, FormFieldRules, MetaToViewComponents } from './constants';

const MetaToViewTypeSchema = z.enum(Object.values(MetaToViewComponents));

const MetaToViewSchema = z.record(
  z.string(),
  z.object({
    label: z.string().optional(),
    type: MetaToViewTypeSchema.optional()
  })
)

const FormFieldRuleSchema = z.enum(Object.values(FormFieldRules))

/**
 * Schema for base form field (properties shared across form components)
 */
const FormFieldBaseSchema = z.object({
  id: z.string(),
  description: z.string(),
  label: z.string(),
  infoText: z.string().optional(),
  rules: FormFieldRuleSchema.array(),
}).strict()

// Invidual form components

const CheckboxSchema = FormFieldBaseSchema.extend({
  inputType: z.literal(FormComponents.checkbox),
  options: z.object({
    id: z.string(),
    label: z.string(),
    value: z.string()
  }).array().nonempty()
})

const InputTextSchema = FormFieldBaseSchema.extend({
  inputType: z.literal(FormComponents.text),
  defaultValue: z.string().optional()
})

const SelectColumnsSchema = FormFieldBaseSchema.extend({
  inputType: z.literal(FormComponents.selectColumns)
})

const SelectSchema = FormFieldBaseSchema.extend({
  inputType: z.literal(FormComponents.select),
  options: z.object({
    id: z.string(),
    label: z.string(),
    value: z.string()
  }).array()
})

/**
 * Build a discriminated union for the form components.
 */
const FormFieldSchema = z.discriminatedUnion('inputType', [
  CheckboxSchema,
  InputTextSchema,
  SelectColumnsSchema,
  SelectSchema
])

/**
 * Schema of a reconciliator service
 */
export const ReconciliatorSchema = z.object({
  private: z.object({
    endpoint: z.string().optional(),
    processRequest: z.boolean().optional()
  }).passthrough(),
  public: z.object({
    name: z.string(),
    prefix: z.string(),
    relativeUrl: z.string(),
    description: z.string(),
    uri: z.string(),
    metaToView: MetaToViewSchema,
    formParams: FormFieldSchema.array().optional()
  })
})

/**
 * Schema of an extender service
 */
export const ExtenderSchema = z.object({
  private: z.object({
    endpoint: z.string().optional(),
    processRequest: z.boolean().optional()
  }).passthrough(),
  public: z.object({
    name: z.string(),
    relativeUrl: z.string(),
    description: z.string(),
    formParams: FormFieldSchema.array().optional()
  })
})