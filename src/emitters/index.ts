import type { Project, ShellType } from '../types.js';
import { ProjectEmitter } from './ProjectEmitter.js';

export interface EmitterContext {
  project: Project;
  fullPath: string;
  noEnv: boolean;
}

export function emit(shell: ShellType, ctx: EmitterContext): string {
  const emitter = new ProjectEmitter(shell);
  return emitter.emit(ctx);
}

export function emitReset(shell: ShellType, projectsDir: string): string {
  const emitter = new ProjectEmitter(shell);
  return emitter.emitReset(projectsDir);
}

// Re-export for direct usage
export { ProjectEmitter } from './ProjectEmitter.js';
export { ShellAdapter } from './ShellAdapter.js';
export * from './services/index.js';
