#!/usr/bin/env bun

// Force color output when stderr is a TTY (needed because we render to stderr)
if (process.stderr.isTTY && !process.env.FORCE_COLOR) {
  process.env.FORCE_COLOR = '1';
}

import React from 'react';
import { render } from 'ink';
import { parseArgs } from 'util';
import { existsSync, statSync } from 'node:fs';
import { loadConfig, resolveProjectPath } from './config.js';
import { findProject, validatePathExists, error } from './utils.js';
import { emit, emitReset } from './emitters/index.js';
import { ProjectSelector } from './components/ProjectSelector.js';
import type { ShellType, Project } from './types.js';

const VERSION = '3.0.0';

const HELP = `
switch-craft - Cross-shell project switcher with environment management

USAGE:
  switch-craft <command> [options] [args]

COMMANDS:
  go <shell> [name]             Switch to project (interactive if no name)
  reset <shell>                 Reset environment and go to projects dir
  path [name]                   Print project path (interactive if no name)
  list                          List all configured projects
  select <shell>                Interactive fuzzy project selector

SHELLS:
  sh      Bash/Zsh compatible output
  fish    Fish shell output
  pwsh    PowerShell output

OPTIONS:
  --no-env       Skip environment variable exports
  -h, --help     Show this help message
  -v, --version  Show version

CONFIGURATION:
  Default config: ~/.config/switch-craft/config.json

  Environment variables:
    SWITCH_CRAFT_CONFIG       Path to config file
    SWITCH_CRAFT_PROJECTS_DIR Override base projects directory

SHELL INTEGRATION (add to your shell profile):

  # Bash/Zsh
  sc() { eval "$(switch-craft go sh "$@")"; }
  scx() { eval "$(switch-craft select sh)"; }
  scc() { eval "$(switch-craft reset sh)"; }
  alias scl="switch-craft list"

  # Fish
  function sc; switch-craft go fish $argv | source; end
  function scx; switch-craft select fish | source; end
  function scc; switch-craft reset fish | source; end
  alias scl="switch-craft list"

  # PowerShell
  function sc { Invoke-Expression (& switch-craft go pwsh $args) }
  function scx { Invoke-Expression (& switch-craft select pwsh) }
  function scc { Invoke-Expression (& switch-craft reset pwsh) }
  function scl { & switch-craft list }

EXAMPLES:
  switch-craft go sh myproject
  switch-craft reset sh
  switch-craft list
  switch-craft select sh
`;

const VALID_SHELLS: ShellType[] = ['sh', 'fish', 'pwsh'];

function showHelp(): void {
  console.log(HELP.trim());
  process.exit(0);
}

function showVersion(): void {
  console.log(`switch-craft ${VERSION}`);
  process.exit(0);
}

function validateShell(shell: string | undefined): ShellType {
  if (!shell) {
    error('Missing shell type. Must be one of: sh, fish, pwsh');
  }
  if (!VALID_SHELLS.includes(shell as ShellType)) {
    error(`Invalid shell type "${shell}". Must be one of: sh, fish, pwsh`);
  }
  return shell as ShellType;
}

// Non-interactive commands
function listCommand(): void {
  const config = loadConfig();
  if (config.projects.length === 0) {
    console.log('No projects configured.');
    return;
  }
  for (const project of config.projects) {
    const fullPath = resolveProjectPath(config.projectsDir, project.path);
    let status = '';
    if (!existsSync(fullPath)) {
      status = ' (path not found)';
    } else {
      try {
        const stat = statSync(fullPath);
        if (!stat.isDirectory()) status = ' (not a directory)';
      } catch {
        status = ' (path not found)';
      }
    }
    console.log(`${project.name}${status}`);
  }
}

function pathCommand(projectName: string): void {
  const config = loadConfig();
  const project = findProject(config.projects, projectName);
  if (!project) {
    const available = config.projects.map((p) => p.name).join(', ');
    error(`Project "${projectName}" not found. Available: ${available}`);
  }
  const fullPath = resolveProjectPath(config.projectsDir, project.path);
  validatePathExists(fullPath, project.name);
  console.log(fullPath);
}

function emitCommand(shell: ShellType, projectName: string, noEnv: boolean): void {
  const config = loadConfig();
  const project = findProject(config.projects, projectName);
  if (!project) {
    const available = config.projects.map((p) => p.name).join(', ');
    error(`Project "${projectName}" not found. Available: ${available}`);
  }
  const fullPath = resolveProjectPath(config.projectsDir, project.path);
  validatePathExists(fullPath, project.name);
  const output = emit(shell, { project, fullPath, noEnv });
  console.log(output);
}

function resetCommand(shell: ShellType): void {
  const config = loadConfig();
  const output = emitReset(shell, config.projectsDir);
  console.log(output);
}

// Interactive mode with Ink
async function interactiveSelect(
  mode: 'emit' | 'path',
  shell?: ShellType,
  noEnv?: boolean
): Promise<void> {
  if (!process.stdin.isTTY) {
    error('Interactive mode requires a TTY. Use "switch-craft list" to see projects.');
  }

  const config = loadConfig();
  if (config.projects.length === 0) {
    error('No projects configured.');
  }

  return new Promise((resolve) => {
    const handleSelect = (project: Project) => {
      // Clear the Ink output
      instance.clear();
      instance.unmount();

      const fullPath = resolveProjectPath(config.projectsDir, project.path);
      validatePathExists(fullPath, project.name);

      if (mode === 'path') {
        console.log(fullPath);
      } else if (mode === 'emit' && shell) {
        const output = emit(shell, { project, fullPath, noEnv: noEnv ?? false });
        console.log(output);
      }

      resolve();
    };

    const handleCancel = () => {
      instance.clear();
      instance.unmount();
      process.exit(130);
    };

    const instance = render(
      <ProjectSelector
        projects={config.projects}
        onSelect={handleSelect}
        onCancel={handleCancel}
        projectsDir={config.projectsDir}
        noEnv={noEnv}
        icons={config.icons}
      />,
      {
        stdout: process.stderr, // Render UI to stderr, keep stdout for shell commands
        patchConsole: false,
      }
    );
  });
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'no-env': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) showHelp();
  if (values.version) showVersion();

  const command = positionals[0];

  if (!command) {
    showHelp();
  }

  switch (command) {
    case 'go': {
      const shell = validateShell(positionals[1]);
      const projectName = positionals[2];
      if (!projectName) {
        await interactiveSelect('emit', shell, values['no-env']);
      } else {
        emitCommand(shell, projectName, values['no-env'] ?? false);
      }
      break;
    }

    case 'reset': {
      const shell = validateShell(positionals[1]);
      resetCommand(shell);
      break;
    }

    case 'path': {
      const projectName = positionals[1];
      if (!projectName) {
        await interactiveSelect('path');
      } else {
        pathCommand(projectName);
      }
      break;
    }

    case 'list': {
      listCommand();
      break;
    }

    case 'select': {
      const shell = validateShell(positionals[1]);
      await interactiveSelect('emit', shell, values['no-env']);
      break;
    }

    default:
      error(`Unknown command: ${command}`);
  }
}

main().catch((err) => {
  console.error(`switch-craft: ${err.message}`);
  process.exit(1);
});
