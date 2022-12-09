import { readFile, writeFile } from 'fs/promises';
import { nanoid } from 'nanoid'

function readArg(key) {
  const args = process.argv.slice(2);

  const argIndex = args.findIndex((arg) => arg === `--${key}`);

  if (argIndex === -1) {
    return undefined;
  }

  let value = args[argIndex + 1];

  value = value.startsWith('--') ? undefined : value

  return value;
}

const path = readArg('path');
if (!path) {
  process.stdout.write("--path is undefined\r");
  process.exit(0);
}

const username = readArg('user');
if (!username) {
  process.stdout.write("--user is undefined\r");
  process.exit(0);
}

const { meta, users } = JSON.parse(await readFile(path));

if (Object.values(users).some((user) => user.username === username)) {
  process.stdout.write(`--user ${username} already exists\r`);
  process.exit(0);
}

const { lastIndex } = meta;
const id = lastIndex + 1;

const newUser = {
  id,
  username,
  password: nanoid()
}

users[id] = newUser;

const newCollection = {
  meta: {
    lastIndex: id
  },
  users
};

await writeFile(path, JSON.stringify(newCollection, null, 2));
process.stdout.write(`Added user "${username}"\r`);







