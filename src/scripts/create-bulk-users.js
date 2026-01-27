import { readFile, writeFile, copyFile, unlink, access } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import config to get helper functions
const CONFIG = (await import('../../config.js')).default;

// Helper function to get paths
const loadHelperFunctions = () => {
  const { datasetFilesPath, datasetDbPath, tablesDbPath, tmpPath, usersPath } = CONFIG;

  return {
    getDatasetFilesPath: () => `${process.env.PWD}${datasetFilesPath}`,
    getDatasetDbPath: () => `${process.env.PWD}${datasetDbPath}`,
    getTablesDbPath: () => `${process.env.PWD}${tablesDbPath}`,
    getTmpPath: () => `${process.env.PWD}${tmpPath}`,
    getUsersPath: () => `${process.env.PWD}${usersPath}`,
  };
};

const helpers = loadHelperFunctions();

// Import the dataset service dynamically
const DatasetsService = (await import('../api/services/datasets/datasets.service.js')).default;

/**
 * Reads a command line argument
 */
function readArg(key) {
  const args = process.argv.slice(2);
  const argIndex = args.findIndex((arg) => arg === `--${key}`);

  if (argIndex === -1) {
    return undefined;
  }

  let value = args[argIndex + 1];
  value = value && value.startsWith('--') ? undefined : value;

  return value;
}

/**
 * Pads a number with leading zeros
 */
function padNumber(num, length = 2) {
  return String(num).padStart(length, '0');
}

/**
 * Creates a single user and initializes their dataset
 */
async function createUser(userId, username, password, zipFilePath, datasetName) {
  try {
    console.log(`Creating user: ${username}...`);

    // Copy the zip file to a temporary location with a unique name
    const tempFilePath = path.join(
      helpers.getTmpPath(),
      `bulk_user_${userId}_${Date.now()}.zip`
    );

    await copyFile(zipFilePath, tempFilePath);

    // Call the dataset service to create the initial dataset
    const result = await DatasetsService.addDataset(tempFilePath, datasetName, userId);

    console.log(`✓ User ${username} created successfully with dataset "${datasetName}"`);
    return { success: true, username, result };
  } catch (err) {
    console.error(`✗ Error creating user ${username}:`, err.message);
    return { success: false, username, error: err.message };
  }
}

/**
 * Main function to create bulk users
 */
async function main() {
  console.log('\n=== Bulk User Creation Script ===\n');

  // Read command line arguments
  const count = parseInt(readArg('count') || readArg('n'), 10);
  const zipPath = readArg('zip') || readArg('dataset');
  const datasetName = readArg('dataset-name') || 'Evaluation';
  const usernamePrefix = readArg('prefix') || 'test_user';
  const passwordPrefix = readArg('password-prefix') || 'semtui_test';

  // Validate inputs
  if (!count || isNaN(count) || count < 1) {
    console.error('Error: Please provide a valid count using --count or -n');
    console.log('\nUsage:');
    console.log('  node src/scripts/create-bulk-users.js --count <number> --zip <path-to-zip>');
    console.log('\nOptions:');
    console.log('  --count, -n              Number of users to create (required)');
    console.log('  --zip, --dataset         Path to zip file for default dataset (required)');
    console.log('  --dataset-name           Name for the dataset (default: "Evaluation")');
    console.log('  --prefix                 Username prefix (default: "test_user")');
    console.log('  --password-prefix        Password prefix (default: "semtui_test")');
    console.log('\nExample:');
    console.log('  node src/scripts/create-bulk-users.js --count 50 --zip ./public/template.zip');
    process.exit(1);
  }

  if (!zipPath) {
    console.error('Error: Please provide a zip file path using --zip or --dataset');
    process.exit(1);
  }

  // Verify zip file exists
  if (!existsSync(zipPath)) {
    console.error(`Error: Zip file not found at path: ${zipPath}`);
    process.exit(1);
  }

  // Verify users database exists
  const usersPath = helpers.getUsersPath();
  if (!existsSync(usersPath)) {
    console.error(`Error: Users database not found at: ${usersPath}`);
    console.error('Please make sure the backend has been initialized.');
    process.exit(1);
  }

  console.log(`Configuration:`);
  console.log(`  - Users to create: ${count}`);
  console.log(`  - Dataset zip: ${zipPath}`);
  console.log(`  - Dataset name: ${datasetName}`);
  console.log(`  - Username format: ${usernamePrefix}_N`);
  console.log(`  - Password format: ${passwordPrefix}_NN`);
  console.log('');

  try {
    // Read existing users
    const usersData = JSON.parse(await readFile(usersPath, 'utf8'));
    const { meta, users } = usersData;
    let { lastIndex } = meta;

    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    // Create users sequentially
    for (let i = 1; i <= count; i++) {
      const username = `${usernamePrefix}_${i}`;
      const password = `${passwordPrefix}_${padNumber(i, 2)}`;

      // Check if username already exists
      const existingUser = Object.values(users).find(
        (user) => user.username === username
      );

      if (existingUser) {
        console.log(`⊘ User ${username} already exists, skipping...`);
        results.skipped.push(username);
        continue;
      }

      // Increment user ID
      lastIndex += 1;
      const userId = lastIndex;

      // Create new user object
      const newUser = {
        id: userId,
        username,
        email: username,
        password,
        createdAt: new Date().toISOString(),
      };

      // Add user to the users object
      users[userId] = newUser;

      // Save updated users database after each user creation
      const updatedUsersDb = {
        meta: { lastIndex },
        users,
      };

      await writeFile(usersPath, JSON.stringify(updatedUsersDb, null, 2));

      // Create dataset for the user
      const result = await createUser(userId, username, password, zipPath, datasetName);

      if (result.success) {
        results.successful.push(username);
      } else {
        results.failed.push({ username, error: result.error });
      }

      // Small delay to avoid overwhelming the system
      if (i < count) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Print summary
    console.log('\n=== Summary ===');
    console.log(`✓ Successfully created: ${results.successful.length} users`);
    if (results.skipped.length > 0) {
      console.log(`⊘ Skipped (already exist): ${results.skipped.length} users`);
    }
    if (results.failed.length > 0) {
      console.log(`✗ Failed: ${results.failed.length} users`);
      console.log('\nFailed users:');
      results.failed.forEach(({ username, error }) => {
        console.log(`  - ${username}: ${error}`);
      });
    }

    console.log('\nAll operations completed!');

    if (results.successful.length > 0) {
      console.log('\nCredentials for created users:');
      console.log('─'.repeat(60));
      for (let i = 1; i <= count; i++) {
        const username = `${usernamePrefix}_${i}`;
        if (results.successful.includes(username)) {
          const password = `${passwordPrefix}_${padNumber(i, 2)}`;
          console.log(`${username.padEnd(30)} | ${password}`);
        }
      }
      console.log('─'.repeat(60));
    }

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Fatal error:', err);
    process.exit(1);
  }
}

// Run the script
main();
