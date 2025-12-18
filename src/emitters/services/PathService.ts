import { BaseService } from './BaseService.js';

export class PathService extends BaseService {
  getLabel(): string {
    return 'path';
  }

  getColor(): string {
    return '#AAAAAA'; // Gray for path
  }

  activate(path: string): string[] {
    return [this.shell.cd(path)];
  }

  deactivate(): string[] {
    return [];
  }
}
