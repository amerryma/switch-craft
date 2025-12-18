import type { ShellAdapter } from '../ShellAdapter.js';

export abstract class BaseService {
  constructor(protected shell: ShellAdapter) {}

  abstract activate(value: string): string[];
  abstract deactivate(): string[];
  abstract getLabel(): string;
  abstract getColor(): string; // Hex color like '#FF5500'
}
