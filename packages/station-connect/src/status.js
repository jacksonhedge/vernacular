import chalk from 'chalk';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const PREFIX = chalk.bold.cyan('[Vernacular]');
const ENV_PATH = path.join(homedir(), 'vernacular', '.env');

function readEnvValue(key) {
  if (!existsSync(ENV_PATH)) return null;
  const content = readFileSync(ENV_PATH, 'utf-8');
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1] : null;
}

function getPm2Status() {
  try {
    const output = execSync('pm2 jlist 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
    const processes = JSON.parse(output);
    const watcher = processes.find((p) => p.name === 'vernacular-watcher');
    return watcher || null;
  } catch {
    return null;
  }
}

export async function showStatus() {
  console.log(`${PREFIX} ${chalk.bold('Station Status')}`);
  console.log();

  // .env check
  if (!existsSync(ENV_PATH)) {
    console.log(`${PREFIX} ${chalk.red('Not configured.')} Run 'vernacular-station connect <phone>' first.`);
    return;
  }

  const stationName = readEnvValue('STATION_NAME') || 'unknown';
  const stationPhone = readEnvValue('STATION_PHONE') || 'unknown';
  const stationId = readEnvValue('STATION_ID') || 'unknown';
  const autoReply = readEnvValue('AUTO_REPLY') || 'unknown';
  const pollInterval = readEnvValue('POLL_INTERVAL_MS') || 'unknown';

  console.log(`${PREFIX} ${chalk.bold('Station:')}    ${stationName}`);
  console.log(`${PREFIX} ${chalk.bold('Phone:')}      ${stationPhone}`);
  console.log(`${PREFIX} ${chalk.bold('ID:')}         ${stationId}`);
  console.log(`${PREFIX} ${chalk.bold('Auto-reply:')} ${autoReply}`);
  console.log(`${PREFIX} ${chalk.bold('Poll:')}       ${pollInterval}ms`);
  console.log();

  // PM2 status
  const pm2 = getPm2Status();
  if (!pm2) {
    console.log(`${PREFIX} ${chalk.bold('Watcher:')}    ${chalk.red('not running')}`);
    console.log(`${PREFIX} Run 'vernacular-station connect ${stationPhone}' to start.`);
  } else {
    const status = pm2.pm2_env?.status || 'unknown';
    const uptime = pm2.pm2_env?.pm_uptime
      ? Math.floor((Date.now() - pm2.pm2_env.pm_uptime) / 1000 / 60)
      : 0;
    const restarts = pm2.pm2_env?.restart_time ?? 0;
    const memory = pm2.monit?.memory
      ? `${Math.round(pm2.monit.memory / 1024 / 1024)}MB`
      : 'N/A';

    const statusColor = status === 'online' ? chalk.green(status) : chalk.red(status);

    console.log(`${PREFIX} ${chalk.bold('Watcher:')}    ${statusColor}`);
    console.log(`${PREFIX} ${chalk.bold('Uptime:')}     ${uptime} minutes`);
    console.log(`${PREFIX} ${chalk.bold('Restarts:')}   ${restarts}`);
    console.log(`${PREFIX} ${chalk.bold('Memory:')}     ${memory}`);
  }

  console.log();
}
