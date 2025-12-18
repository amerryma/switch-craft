import { BaseService } from './BaseService.js';

export class AzureService extends BaseService {
  getLabel(): string {
    return 'azure';
  }

  getColor(): string {
    return '#0078D4'; // Azure blue
  }

  activate(_account: string): string[] {
    // Azure doesn't have a simple activate command like the others
    // Just clear and note the account
    return [this.shell.ifCommandExists('az', 'az account clear >/dev/null 2>&1')];
  }

  deactivate(): string[] {
    return [this.shell.ifCommandExists('az', 'az account clear >/dev/null 2>&1')];
  }
}
