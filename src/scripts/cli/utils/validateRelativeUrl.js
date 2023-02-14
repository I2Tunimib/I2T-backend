export const validateRelativeUrl = async (input) => {
  if (!input.startsWith('/') && input !== '') {
    return 'The relative url must start with a \/ symbol';
  }
  return true;
}