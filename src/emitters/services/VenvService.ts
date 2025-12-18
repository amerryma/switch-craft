import type { ShellType } from '../../types.js';
import type { ShellAdapter } from '../ShellAdapter.js';
import { BaseService } from './BaseService.js';

export class VenvService extends BaseService {
  constructor(
    shell: ShellAdapter,
    private shellType: ShellType
  ) {
    super(shell);
  }

  getLabel(): string {
    return 'venv';
  }

  getColor(): string {
    return '#3776AB'; // Python blue
  }

  activate(venvPath: string): string[] {
    const activatePath =
      this.shellType === 'pwsh'
        ? `${venvPath}/Scripts/Activate.ps1`
        : this.shellType === 'fish'
          ? `${venvPath}/bin/activate.fish`
          : `${venvPath}/bin/activate`;

    return [this.shell.fileExists(activatePath, this.shell.sourceFile(activatePath))];
  }

  deactivate(): string[] {
    return [this.shell.ifCommandExists('deactivate', 'deactivate 2>/dev/null')];
  }
}
