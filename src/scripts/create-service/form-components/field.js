export const field = ({ id, description, label, infoText, rules, type }) => {
  return {
    id,
    description,
    label,
    rules,
    infoText,
    ...type
  }
}

