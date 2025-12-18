import { BaseService } from './BaseService.js';

export class GCloudService extends BaseService {
  getLabel(): string {
    return 'gcp';
  }

  getColor(): string {
    return '#4285F4'; // Google blue
  }

  activate(config: string): string[] {
    return [
      this.shell.ifCommandExists(
        'gcloud',
        `gcloud config configurations activate ${this.shell.escape(config)} >/dev/null 2>&1`
      ),
    ];
  }

  deactivate(): string[] {
    return [
      this.shell.ifCommandExists(
        'gcloud',
        'gcloud config configurations activate default >/dev/null 2>&1'
      ),
    ];
  }
}
