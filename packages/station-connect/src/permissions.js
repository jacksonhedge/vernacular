import chalk from 'chalk';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import path from 'node:path';

const PREFIX = chalk.bold.cyan('[Vernacular]');

function pressEnterToContinue(message) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${PREFIX} ${message} Press Enter when done...`, () => {
      rl.close();
      resolve();
    });
  });
}

function detectTerminal() {
  const term = process.env.TERM_PROGRAM || '';
  const parentName = process.env._ || '';

  if (term === 'vscode' || process.env.VSCODE_PID) {
    return 'VS Code integrated terminal';
  }
  if (parentName.includes('claude') || process.env.CLAUDE_CODE) {
    return 'Claude Code';
  }
  return null;
}

/**
 * Check Full Disk Access by reading chat.db
 */
export function checkFullDiskAccess() {
  const chatDbPath = path.join(homedir(), 'Library', 'Messages', 'chat.db');
  try {
    execSync(`test -r "${chatDbPath}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Contacts access via AppleScript
 */
export function checkContactsAccess() {
  try {
    execSync(
      'osascript -e \'tell application "Contacts" to get name of first person\'',
      { stdio: 'ignore', timeout: 10000 }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Automation access (Messages.app via AppleScript)
 */
export function checkAutomationAccess() {
  try {
    execSync(
      'osascript -e \'tell application "Messages" to get name\'',
      { stdio: 'ignore', timeout: 10000 }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Run all permission checks. For any failure, guide the user
 * to fix it and re-check in a loop.
 */
export async function ensurePermissions() {
  const nonStandardTerminal = detectTerminal();

  if (nonStandardTerminal) {
    console.log();
    console.log(`${PREFIX} ${chalk.yellow('Warning:')} Running inside ${chalk.bold(nonStandardTerminal)}.`);
    console.log(`${PREFIX} macOS grants permissions per-binary. You may need to grant`);
    console.log(`${PREFIX} Full Disk Access to ${chalk.bold(nonStandardTerminal)}'s binary as well.`);
    console.log();
  }

  // --- Full Disk Access ---
  while (!checkFullDiskAccess()) {
    console.log(`${PREFIX} ${chalk.red('Missing:')} Full Disk Access`);
    console.log(`${PREFIX} The watcher needs to read ~/Library/Messages/chat.db`);
    console.log();

    try {
      execSync(
        'open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"',
        { stdio: 'ignore' }
      );
    } catch {
      console.log(`${PREFIX} Open System Settings > Privacy & Security > Full Disk Access`);
    }

    console.log(`${PREFIX} Add your terminal app (e.g. Terminal.app) to the list and toggle it ON.`);
    if (nonStandardTerminal) {
      console.log(`${PREFIX} Also add the binary for ${chalk.bold(nonStandardTerminal)}.`);
    }
    await pressEnterToContinue('');
  }
  console.log(`${PREFIX} ${chalk.green('OK')} Full Disk Access`);

  // --- Contacts Access ---
  while (!checkContactsAccess()) {
    console.log(`${PREFIX} ${chalk.red('Missing:')} Contacts Access`);
    console.log(`${PREFIX} The watcher needs Contacts to resolve names from phone numbers.`);
    console.log();

    try {
      execSync(
        'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts"',
        { stdio: 'ignore' }
      );
    } catch {
      console.log(`${PREFIX} Open System Settings > Privacy & Security > Contacts`);
    }

    await pressEnterToContinue('Grant Contacts access to your terminal app.');
  }
  console.log(`${PREFIX} ${chalk.green('OK')} Contacts Access`);

  // --- Automation (Messages) ---
  while (!checkAutomationAccess()) {
    console.log(`${PREFIX} ${chalk.red('Missing:')} Automation (Messages.app)`);
    console.log(`${PREFIX} The watcher needs to send iMessages via AppleScript.`);
    console.log();

    try {
      execSync(
        'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"',
        { stdio: 'ignore' }
      );
    } catch {
      console.log(`${PREFIX} Open System Settings > Privacy & Security > Automation`);
    }

    await pressEnterToContinue('Grant Automation access for Messages.app.');
  }
  console.log(`${PREFIX} ${chalk.green('OK')} Automation (Messages.app)`);

  console.log();
  console.log(`${PREFIX} ${chalk.green('All permissions verified.')}`);
  console.log();
}
