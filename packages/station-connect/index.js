#!/usr/bin/env node

import chalk from 'chalk';
import { connect } from './src/connect.js';
import { showStatus } from './src/status.js';
import { stopWatcher } from './src/watcher-install.js';

const PREFIX = chalk.bold.cyan('[Vernacular]');

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log();
  console.log(`${PREFIX} ${chalk.bold('iMessage Station Manager')} v1.0.0`);
  console.log();

  if (!command) {
    printUsage();
    process.exit(1);
  }

  switch (command) {
    case 'connect': {
      const phoneNumber = args[1];
      if (!phoneNumber) {
        console.log(`${PREFIX} ${chalk.red('Error:')} Phone number required.`);
        console.log(`${PREFIX} Usage: vernacular-station connect +14125128437`);
        process.exit(1);
      }
      await connect(phoneNumber);
      break;
    }
    case 'status': {
      await showStatus();
      break;
    }
    case 'stop': {
      await stopWatcher();
      break;
    }
    default: {
      console.log(`${PREFIX} ${chalk.red('Unknown command:')} ${command}`);
      printUsage();
      process.exit(1);
    }
  }
}

function printUsage() {
  console.log(`${PREFIX} ${chalk.bold('Usage:')}`);
  console.log();
  console.log(`  ${chalk.green('vernacular-station connect <phone>')}  Connect this Mac as a station`);
  console.log(`  ${chalk.green('vernacular-station status')}           Show station status`);
  console.log(`  ${chalk.green('vernacular-station stop')}             Stop the watcher process`);
  console.log();
  console.log(`${PREFIX} ${chalk.bold('Examples:')}`);
  console.log();
  console.log(`  vernacular-station connect +14125128437`);
  console.log(`  vernacular-station connect "(412) 512-8437"`);
  console.log();
}

main().catch((err) => {
  console.error(`${PREFIX} ${chalk.red('Fatal error:')} ${err.message}`);
  process.exit(1);
});
