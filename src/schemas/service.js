import { z } from 'zod';
import { FormComponents, FormFieldRules, MetaToViewComponents } from './constants.js';

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
  title: z.string().optional(),
  description: z.string().optional(),
  dynamic: z.boolean().optional()
  // label: z.string(),
  // infoText: z.string().optional(),
  // rules: FormFieldRuleSchema.array().optional(),
}).strict()

const FormInputFieldBaseSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  infoText: z.string().optional(),
  defaultValue: z.any().optional(),
  rules: FormFieldRuleSchema.array().optional(),
})

// Invidual form components

const GroupFieldSchema = FormFieldBaseSchema.extend({
  component: z.literal(FormComponents.group),
  fields: z.lazy(() => FormSchema)
})

const CheckboxSchema = FormInputFieldBaseSchema.extend({
  component: z.literal(FormComponents.checkbox),
  options: z.object({
    id: z.string(),
    label: z.string(),
    value: z.string()
  }).array().nonempty()
})

const InputTextSchema = FormInputFieldBaseSchema.extend({
  component: z.literal(FormComponents.text),
  defaultValue: z.string().optional()
})

const SelectColumnsSchema = FormInputFieldBaseSchema.extend({
  component: z.literal(FormComponents.selectColumns)
})

const SelectSchema = FormInputFieldBaseSchema.extend({
  component: z.literal(FormComponents.select),
  options: z.object({
    id: z.string(),
    label: z.string(),
    value: z.string()
  }).array()
})

/**
 * Build a discriminated union for the form components.
 */
const FormFieldSchema = z.discriminatedUnion('component', [
  GroupFieldSchema,
  CheckboxSchema,
  InputTextSchema,
  SelectColumnsSchema,
  SelectSchema
])

export const FormSchema = z.record(z.string(), FormFieldSchema)



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
    formSchema: FormSchema.optional()
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
    formSchema: FormSchema.optional()
    // formParams: FormFieldSchema.array().optional()
  }).strict()
})