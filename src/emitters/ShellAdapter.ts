import type { ShellType } from '../types.js';

export abstract class ShellAdapter {
  abstract echo(text: string): string;
  abstract echoColored(text: string, color: string): string;
  abstract setEnv(key: string, value: string): string;
  abstract unsetEnv(key: string): string;
  abstract cd(path: string): string;
  abstract ifCommandExists(cmd: string, then: string): string;
  abstract sourceFile(path: string): string;
  abstract fileExists(path: string, then: string): string;
  abstract escape(value: string): string;

  static create(shell: ShellType): ShellAdapter {
    switch (shell) {
      case 'sh':
        return new BashAdapter();
      case 'fish':
        return new FishAdapter();
      case 'pwsh':
        return new PowerShellAdapter();
      default:
        throw new Error(`Unknown shell type: ${shell}`);
    }
  }
}

export class BashAdapter extends ShellAdapter {
  echo(text: string): string {
    return `echo -e "${text}"`;
  }

  echoColored(text: string, color: string): string {
    const colors: Record<string, string> = {
      reset: '\\033[0m',
      bold: '\\033[1m',
      dim: '\\033[2m',
      red: '\\033[38;2;255;50;50m',
      orange: '\\033[38;2;255;150;0m',
      yellow: '\\033[38;2;255;255;0m',
      green: '\\033[38;2;50;255;100m',
      cyan: '\\033[38;2;0;255;255m',
      blue: '\\033[38;2;80;150;255m',
      purple: '\\033[38;2;180;100;255m',
      magenta: '\\033[38;2;255;100;255m',
      white: '\\033[97m',
    };
    const c = colors[color] || '';
    const reset = colors.reset;
    return `echo -e "${c}${text}${reset}"`;
  }

  setEnv(key: string, value: string): string {
    return `export ${key}=${this.escape(value)}`;
  }

  unsetEnv(key: string): string {
    return `unset ${key}`;
  }

  cd(path: string): string {
    return `cd ${this.escape(path)}`;
  }

  ifCommandExists(cmd: string, then: string): string {
    return `command -v ${cmd} >/dev/null 2>&1 && ${then}`;
  }

  sourceFile(path: string): string {
    return `source ${this.escape(path)}`;
  }

  fileExists(path: string, then: string): string {
    return `[ -f ${this.escape(path)} ] && ${then}`;
  }

  escape(value: string): string {
    if (/^[a-zA-Z0-9_/.-]+$/.test(value)) {
      return value;
    }
    return `'${value.replace(/'/g, "'\\''")}'`;
  }
}

export class FishAdapter extends ShellAdapter {
  echo(text: string): string {
    return `echo '${text}'`;
  }

  echoColored(text: string, color: string): string {
    const colors: Record<string, string> = {
      red: 'red',
      yellow: 'yellow',
      green: 'green',
      cyan: 'cyan',
      blue: 'blue',
      magenta: 'magenta',
      white: 'white',
      dim: 'brblack',
    };
    const c = colors[color] || 'normal';
    return `set_color ${c}; echo '${text}'; set_color normal`;
  }

  setEnv(key: string, value: string): string {
    return `set -gx ${key} ${this.escape(value)}`;
  }

  unsetEnv(key: string): string {
    return `set -e ${key} 2>/dev/null`;
  }

  cd(path: string): string {
    return `cd ${this.escape(path)}`;
  }

  ifCommandExists(cmd: string, then: string): string {
    return `command -q ${cmd}; and ${then}`;
  }

  sourceFile(path: string): string {
    return `source ${this.escape(path)}`;
  }

  fileExists(path: string, then: string): string {
    return `test -f ${this.escape(path)}; and ${then}`;
  }

  escape(value: string): string {
    if (/^[a-zA-Z0-9_/.-]+$/.test(value)) {
      return value;
    }
    return `'${value.replace(/'/g, "\\'")}'`;
  }
}

export class PowerShellAdapter extends ShellAdapter {
  echo(text: string): string {
    return `Write-Host '${text}'`;
  }

  echoColored(text: string, color: string): string {
    const colors: Record<string, string> = {
      red: 'Red',
      yellow: 'Yellow',
      green: 'Green',
      cyan: 'Cyan',
      blue: 'Blue',
      magenta: 'Magenta',
      white: 'White',
      dim: 'DarkGray',
    };
    const c = colors[color] || 'White';
    return `Write-Host '${text}' -ForegroundColor ${c}`;
  }

  setEnv(key: string, value: string): string {
    return `$env:${key} = ${this.escape(value)}`;
  }

  unsetEnv(key: string): string {
    return `Remove-Item Env:${key} -ErrorAction SilentlyContinue`;
  }

  cd(path: string): string {
    return `Set-Location -LiteralPath ${this.escape(path)}`;
  }

  ifCommandExists(cmd: string, then: string): string {
    return `if (Get-Command ${cmd} -ErrorAction SilentlyContinue) { ${then} }`;
  }

  sourceFile(path: string): string {
    return `. ${this.escape(path)}`;
  }

  fileExists(path: string, then: string): string {
    return `if (Test-Path ${this.escape(path)}) { ${then} }`;
  }

  escape(value: string): string {
    if (/^[a-zA-Z0-9_/.-]+$/.test(value)) {
      return `'${value}'`;
    }
    return `'${value.replace(/'/g, "''")}'`;
  }
}
