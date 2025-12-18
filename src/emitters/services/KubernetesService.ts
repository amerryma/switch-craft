import { BaseService } from './BaseService.js';

export class KubernetesService extends BaseService {
  getLabel(): string {
    return 'k8s';
  }

  getColor(): string {
    return '#326CE5'; // Kubernetes blue
  }

  activate(context: string): string[] {
    return [
      this.shell.ifCommandExists('kubectx', `kubectx ${this.shell.escape(context)} >/dev/null`),
    ];
  }

  deactivate(): string[] {
    return [this.shell.ifCommandExists('kubectx', 'kubectx -u >/dev/null 2>&1')];
  }
}
