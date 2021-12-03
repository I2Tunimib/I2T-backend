const colors = {
  reset: '\x1b[0m',
  api: '\x1b[35m',
  db: '\x1b[31m',
  mantis: '\x1b[32m',
  socketio: '\x1b[34m'
}

export const colorString = (type) => {
  return `${colors[type]}[${type.toUpperCase()}]${colors.reset}`;
}

export const log = (type, value) => {
  console.log(`${colorString(type)} ${value}`)
}