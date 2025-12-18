import type { Project, ShellType } from '../types.js';
import { ShellAdapter } from './ShellAdapter.js';
import {
  KubernetesService,
  GCloudService,
  AWSService,
  AzureService,
  VenvService,
  getServiceColor,
} from './services/index.js';

export interface EmitContext {
  project: Project;
  fullPath: string;
  noEnv: boolean;
}

export class ProjectEmitter {
  private shell: ShellAdapter;
  private shellType: ShellType;

  // Services
  private k8s: KubernetesService;
  private gcloud: GCloudService;
  private aws: AWSService;
  private azure: AzureService;
  private venv: VenvService;

  constructor(shellType: ShellType) {
    this.shellType = shellType;
    this.shell = ShellAdapter.create(shellType);

    // Initialize services
    this.k8s = new KubernetesService(this.shell);
    this.gcloud = new GCloudService(this.shell);
    this.aws = new AWSService(this.shell);
    this.azure = new AzureService(this.shell);
    this.venv = new VenvService(this.shell, shellType);
  }

  emit(ctx: EmitContext): string {
    const lines: string[] = [];
    const { project, fullPath, noEnv } = ctx;

    // Banner
    lines.push(...this.generateBanner(project.name));

    // Info table
    lines.push(...this.generateTable(ctx));

    if (!noEnv) {
      // Deactivate venv first (always)
      lines.push(...this.venv.deactivate());

      // Kubernetes
      if (project.kubectx) {
        lines.push(...this.k8s.activate(project.kubectx));
      } else {
        lines.push(...this.k8s.deactivate());
      }

      // GCloud
      if (project.gcloud) {
        lines.push(...this.gcloud.activate(project.gcloud));
      } else {
        lines.push(...this.gcloud.deactivate());
      }

      // AWS
      if (project.aws) {
        lines.push(...this.aws.activate(project.aws));
      } else {
        lines.push(...this.aws.deactivate());
      }

      // Azure
      lines.push(...this.azure.deactivate());

      // Custom env vars
      if (project.env) {
        for (const [key, value] of Object.entries(project.env)) {
          lines.push(this.shell.setEnv(key, value));
        }
      }

      // Venv (activate after everything else)
      if (project.venv) {
        lines.push(...this.venv.activate(project.venv));
      }
    }

    // Change directory last
    lines.push(this.shell.cd(fullPath));

    return lines.join('\n');
  }

  emitReset(projectsDir: string): string {
    const lines: string[] = [];

    // Banner
    lines.push(this.shell.echo(''));
    lines.push(this.shell.echoColored('  RESET', 'yellow'));
    lines.push(this.shell.echo(''));

    // Deactivate all services
    lines.push(...this.venv.deactivate());
    lines.push(...this.k8s.deactivate());
    lines.push(...this.gcloud.deactivate());
    lines.push(...this.aws.deactivate());
    lines.push(...this.azure.deactivate());

    // Go to projects dir
    lines.push(this.shell.cd(projectsDir));

    return lines.join('\n');
  }

  private generateBanner(name: string): string[] {
    if (this.shellType === 'sh') {
      return this.generateShBanner(name);
    }
    // Simpler banner for Fish/PowerShell
    return [
      this.shell.echo(''),
      this.shell.echoColored(`  Switched to ${name}...`, 'cyan'),
      this.shell.echo(''),
    ];
  }

  private generateShBanner(name: string): string[] {
    // Rainbow text from center outward
    const mid = Math.floor(name.length / 2);
    const colorCodes = [
      '\\033[38;2;255;50;50m', // red
      '\\033[38;2;255;150;0m', // orange
      '\\033[38;2;255;255;0m', // yellow
      '\\033[38;2;50;255;100m', // green
      '\\033[38;2;0;255;255m', // cyan
      '\\033[38;2;80;150;255m', // blue
      '\\033[38;2;180;100;255m', // purple
      '\\033[38;2;255;100;255m', // magenta
    ];
    const reset = '\\033[0m';
    const bold = '\\033[1m';
    const dim = '\\033[2m';

    const coloredName =
      name
        .split('')
        .map((char, i) => {
          const dist = Math.abs(i - mid);
          const color = colorCodes[dist % colorCodes.length];
          return `${color}${char}`;
        })
        .join('') + reset;

    return [
      `echo -e ""`,
      `echo -e "  ${dim}Switched to${reset} ${bold}${coloredName}${reset}${dim}...${reset}"`,
      `echo -e ""`,
    ];
  }

  private generateTable(ctx: EmitContext): string[] {
    const { project, fullPath, noEnv } = ctx;

    interface TableRow {
      label: string;
      value: string;
      colorKey: string;
    }

    const rows: TableRow[] = [{ label: 'path', value: fullPath, colorKey: 'path' }];

    if (!noEnv) {
      if (project.kubectx) {
        rows.push({ label: 'k8s', value: project.kubectx, colorKey: 'k8s' });
      }
      if (project.gcloud) {
        rows.push({ label: 'gcp', value: project.gcloud, colorKey: 'gcp' });
      }
      if (project.aws) {
        rows.push({ label: 'aws', value: project.aws, colorKey: 'aws' });
      }
      if (project.azure) {
        rows.push({ label: 'azure', value: project.azure, colorKey: 'azure' });
      }
      if (project.venv) {
        rows.push({ label: 'venv', value: project.venv, colorKey: 'venv' });
      }
      if (project.env) {
        for (const [key, value] of Object.entries(project.env)) {
          rows.push({ label: `$${key}`, value, colorKey: key });
        }
      }
    }

    if (this.shellType === 'sh') {
      return this.generateShTable(rows);
    }
    return this.generateSimpleTable(rows);
  }

  private hexToAnsi(hex: string): string {
    // Convert #RRGGBB to ANSI escape code
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\\033[38;2;${r};${g};${b}m`;
  }

  private generateShTable(rows: { label: string; value: string; colorKey: string }[]): string[] {
    const lines: string[] = [];
    const reset = '\\033[0m';
    const dim = '\\033[2m';
    const white = '\\033[97m';

    const maxLabel = Math.max(...rows.map((r) => r.label.length), 6);
    const maxValue = Math.max(...rows.map((r) => r.value.length), 10);
    const boxWidth = maxLabel + maxValue + 3;

    const topBorder = '┌' + '─'.repeat(boxWidth) + '┐';
    const bottomBorder = '└' + '─'.repeat(boxWidth) + '┘';

    lines.push(`echo -e "  ${white}${topBorder}${reset}"`);

    for (const row of rows) {
      const hexColor = getServiceColor(row.colorKey);
      const color = this.hexToAnsi(hexColor);
      const label = row.label.padEnd(maxLabel);
      const value = row.value.padEnd(maxValue);
      lines.push(
        `echo -e "  ${white}│${reset} ${color}${label}${reset} ${dim}${value}${reset} ${white}│${reset}"`
      );
    }

    lines.push(`echo -e "  ${white}${bottomBorder}${reset}"`);
    lines.push(`echo -e ""`);

    return lines;
  }

  private generateSimpleTable(
    rows: { label: string; value: string; colorKey: string }[]
  ): string[] {
    const lines: string[] = [];
    const maxLabel = Math.max(...rows.map((r) => r.label.length), 8);

    for (const row of rows) {
      const label = row.label.padEnd(maxLabel);
      if (this.shellType === 'fish') {
        lines.push(
          `set_color brblack; printf '│ '; set_color cyan; printf '${label}'; set_color normal; printf ' '; set_color green; echo '${row.value}'; set_color normal`
        );
      } else {
        lines.push(
          `Write-Host '│ ' -ForegroundColor DarkGray -NoNewline; Write-Host '${label}' -ForegroundColor Cyan -NoNewline; Write-Host ' ' -NoNewline; Write-Host '${row.value}' -ForegroundColor Green`
        );
      }
    }

    return lines;
  }
}
