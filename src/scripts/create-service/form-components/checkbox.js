export const checkbox = (options = []) => {
  return {
    inputType: 'checkbox',
    options
  };
}

export const option = ({ id, label, value }) => {
  return {
    id,
    label,
    value
  }
}