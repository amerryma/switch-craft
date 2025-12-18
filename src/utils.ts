import { existsSync, statSync } from 'node:fs';
import Fuse from 'fuse.js';
import type { Project } from './types.js';

export function error(message: string): never {
  console.error(`switch-craft: ${message}`);
  process.exit(1);
}

export function validatePathExists(path: string, projectName: string): void {
  if (!existsSync(path)) {
    error(`Project "${projectName}" path does not exist: ${path}`);
  }

  const stat = statSync(path);
  if (!stat.isDirectory()) {
    error(`Project "${projectName}" path is not a directory: ${path}`);
  }
}

export function findProject(projects: Project[], name: string): Project | null {
  // First try exact match
  const exact = projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (exact) {
    return exact;
  }

  // Then try fuzzy search
  const fuse = new Fuse(projects, {
    keys: ['name'],
    threshold: 0.4,
    includeScore: true,
  });

  const results = fuse.search(name);
  if (results.length > 0 && results[0].score !== undefined && results[0].score <= 0.4) {
    return results[0].item;
  }

  return null;
}

export function escapeShellArg(arg: string, shell: 'sh' | 'fish' | 'pwsh'): string {
  if (shell === 'pwsh') {
    // PowerShell escaping: use single quotes and double any single quotes inside
    return `'${arg.replace(/'/g, "''")}'`;
  }
  // POSIX shell (bash/zsh/fish): use single quotes and escape single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
