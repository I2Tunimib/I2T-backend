const pipe = async (input) => async (...validateFns) => {
  for (const fn of validateFns) {
    await fn(input)
  }
}