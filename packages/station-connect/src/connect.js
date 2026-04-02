import chalk from 'chalk';
import ora from 'ora';
import { hostname } from 'node:os';
import { ensurePermissions } from './permissions.js';
import { lookupStation, upsertStation, getStationConfig, getSupabaseUrl, getServiceKey } from './supabase.js';
import { writeEnvFile, getEnvPath } from './env-writer.js';
import { installDependencies, createWatcherScript, startWithPM2 } from './watcher-install.js';

const PREFIX = chalk.bold.cyan('[Vernacular]');

const NOTION_TOKEN = 'ntn_kP36443001250ZD4POrY2x87yql2zwGWY4Zmpihsf3I2nw';
const NOTION_DB = 'db0fb0b9-9f4a-46b4-b0f6-3084aa3f2956';
const VERNACULAR_API = 'https://vernacular.chat';

/**
 * Normalize phone number to +1XXXXXXXXXX format.
 * Accepts: +14125128437, (412) 512-8437, 412-512-8437, 4125128437
 */
function normalizePhone(input) {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Main connect flow: steps 0-8
 */
export async function connect(rawPhone) {
  // ===== Step 0: Check permissions =====
  console.log(`${PREFIX} ${chalk.bold('Step 0:')} Checking macOS permissions...`);
  console.log();
  await ensurePermissions();

  // ===== Step 1: Validate phone number =====
  const spinner = ora({ prefixText: PREFIX }).start('Validating phone number...');

  const phoneNumber = normalizePhone(rawPhone);
  if (!phoneNumber) {
    spinner.fail(`Invalid phone number: ${rawPhone}`);
    console.log(`${PREFIX} Expected format: +1XXXXXXXXXX or (XXX) XXX-XXXX`);
    process.exit(1);
  }
  spinner.succeed(`Phone number: ${chalk.bold(phoneNumber)}`);

  // ===== Step 2: Authenticate to Supabase =====
  const authSpinner = ora({ prefixText: PREFIX }).start('Authenticating to Supabase...');
  try {
    // Just verify we can reach Supabase by doing a simple query
    await lookupStation(phoneNumber);
    authSpinner.succeed('Connected to Supabase');
  } catch (err) {
    authSpinner.fail(`Supabase auth failed: ${err.message}`);
    process.exit(1);
  }

  // ===== Step 3: Look up station =====
  const lookupSpinner = ora({ prefixText: PREFIX }).start(`Looking up ${phoneNumber} in stations...`);

  let station = await lookupStation(phoneNumber);

  if (!station) {
    lookupSpinner.text = 'Phone not found. Creating station record...';
    station = await upsertStation({
      phone_number: phoneNumber,
      status: 'unconfigured',
      station_name: hostname(),
      created_at: new Date().toISOString(),
    });
    lookupSpinner.succeed(`New station created: ${chalk.bold(station.id)}`);
  } else {
    lookupSpinner.succeed(`Station found: ${chalk.bold(station.id)} (${station.status})`);
  }

  // ===== Step 4: Write .env file =====
  const envSpinner = ora({ prefixText: PREFIX }).start('Writing station config...');

  const machineName = hostname();
  const envPath = writeEnvFile({
    supabaseUrl: getSupabaseUrl(),
    supabaseServiceKey: getServiceKey(),
    notionToken: NOTION_TOKEN,
    notionDb: NOTION_DB,
    vernacularApi: VERNACULAR_API,
    stationName: machineName,
    stationPhone: phoneNumber,
    stationId: station.id,
    autoReply: station.auto_reply ?? 'true',
    pollIntervalMs: station.poll_interval_ms ?? 5000,
  });

  envSpinner.succeed(`Config written to ${chalk.dim(envPath)}`);

  // ===== Step 5: Update station record =====
  const updateSpinner = ora({ prefixText: PREFIX }).start('Updating station record...');

  station = await upsertStation({
    phone_number: phoneNumber,
    station_name: machineName,
    status: 'online',
    last_connected_at: new Date().toISOString(),
  });

  updateSpinner.succeed(`Station status: ${chalk.green('online')}`);

  // ===== Step 6: Install watcher dependencies =====
  const depsSpinner = ora({ prefixText: PREFIX }).start('Installing watcher dependencies...');

  try {
    await installDependencies(depsSpinner);
    depsSpinner.succeed('Watcher dependencies installed');
  } catch (err) {
    depsSpinner.fail(`Dependency install failed: ${err.message}`);
    process.exit(1);
  }

  // ===== Step 7: Start watcher via PM2 =====
  const pm2Spinner = ora({ prefixText: PREFIX }).start('Creating watcher script...');

  createWatcherScript();
  pm2Spinner.text = 'Starting watcher via PM2...';

  try {
    startWithPM2();
    pm2Spinner.succeed('Watcher running via PM2');
  } catch (err) {
    pm2Spinner.fail(`PM2 start failed: ${err.message}`);
    console.log(`${PREFIX} You can start manually: pm2 start ~/vernacular/watcher.js --name vernacular-watcher`);
  }

  // ===== Step 8: Success summary =====
  console.log();
  console.log(chalk.green('='.repeat(50)));
  console.log();
  console.log(`${PREFIX} ${chalk.bold.green('Station connected successfully!')}`);
  console.log();
  console.log(`  ${chalk.bold('Station:')}   ${machineName}`);
  console.log(`  ${chalk.bold('Phone:')}     ${phoneNumber}`);
  console.log(`  ${chalk.bold('ID:')}        ${station.id}`);
  console.log(`  ${chalk.bold('Status:')}    ${chalk.green('online')}`);
  console.log(`  ${chalk.bold('Config:')}    ${envPath}`);
  console.log(`  ${chalk.bold('Watcher:')}   ~/vernacular/watcher.js`);
  console.log();
  console.log(`${PREFIX} ${chalk.bold('Commands:')}`);
  console.log(`  ${chalk.dim('vernacular-station status')}   Check station health`);
  console.log(`  ${chalk.dim('vernacular-station stop')}     Stop the watcher`);
  console.log(`  ${chalk.dim('pm2 logs vernacular-watcher')} View watcher logs`);
  console.log();
  console.log(chalk.green('='.repeat(50)));
  console.log();
}
