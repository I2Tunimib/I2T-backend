export const validateEmpty = async (input) => {
  if (input === '') {
    return 'This option cannot be empty'
  }
  return true;
}