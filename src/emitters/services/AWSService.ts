import { BaseService } from './BaseService.js';

export class AWSService extends BaseService {
  getLabel(): string {
    return 'aws';
  }

  getColor(): string {
    return '#FF9900'; // AWS orange
  }

  activate(profile: string): string[] {
    return [this.shell.setEnv('AWS_PROFILE', profile)];
  }

  deactivate(): string[] {
    return [this.shell.unsetEnv('AWS_PROFILE')];
  }
}
