export interface Project {
  name: string;
  path: string;
  env?: Record<string, string>;
  kubectx?: string;
  gcloud?: string;
  aws?: string;
  azure?: string;
  venv?: string;
}

export interface Icons {
  k8s?: string;
  gcp?: string;
  aws?: string;
  azure?: string;
  venv?: string;
  path?: string;
}

export interface Config {
  projectsDir: string;
  projects: Project[];
  icons?: Icons;
}

export type ShellType = 'sh' | 'fish' | 'pwsh';
