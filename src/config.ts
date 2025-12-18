import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, isAbsolute, resolve } from 'node:path';
import type { Config, Project, Icons } from './types.js';

const DEFAULT_CONFIG_PATH = join(homedir(), '.config', 'switch-craft', 'config.json');

export function getConfigPath(): string {
  return process.env.SWITCH_CRAFT_CONFIG || DEFAULT_CONFIG_PATH;
}

export function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath}\n` +
        `Create a config file or set SWITCH_CRAFT_CONFIG environment variable.`
    );
  }

  let rawConfig: unknown;
  try {
    const content = readFileSync(configPath, 'utf-8');
    rawConfig = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file: ${configPath}`);
    }
    throw new Error(`Failed to read configuration file: ${configPath}`);
  }

  return validateConfig(rawConfig, configPath);
}

function validateConfig(raw: unknown, configPath: string): Config {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Configuration must be a JSON object: ${configPath}`);
  }

  const obj = raw as Record<string, unknown>;

  // Get projectsDir from config or environment
  let projectsDir =
    process.env.SWITCH_CRAFT_PROJECTS_DIR ||
    (typeof obj.projectsDir === 'string' ? obj.projectsDir : null);

  if (!projectsDir) {
    throw new Error(
      `Missing "projectsDir" in config or SWITCH_CRAFT_PROJECTS_DIR environment variable`
    );
  }

  // Expand ~ to home directory
  if (projectsDir.startsWith('~')) {
    projectsDir = join(homedir(), projectsDir.slice(1));
  }

  // Ensure projectsDir is absolute
  if (!isAbsolute(projectsDir)) {
    projectsDir = resolve(projectsDir);
  }

  // Validate projects array
  if (!Array.isArray(obj.projects)) {
    throw new Error(`Missing or invalid "projects" array in configuration`);
  }

  const projects: Project[] = obj.projects.map((p, index) => validateProject(p, index));

  // Parse optional icons
  let icons: Icons | undefined;
  if (obj.icons !== undefined) {
    if (typeof obj.icons !== 'object' || obj.icons === null || Array.isArray(obj.icons)) {
      throw new Error(`"icons" must be an object`);
    }
    icons = {};
    const iconsObj = obj.icons as Record<string, unknown>;
    const validKeys = ['k8s', 'gcp', 'aws', 'azure', 'venv', 'path'];
    for (const key of validKeys) {
      if (iconsObj[key] !== undefined) {
        if (typeof iconsObj[key] !== 'string') {
          throw new Error(`Icon "${key}" must be a string`);
        }
        (icons as Record<string, string>)[key] = iconsObj[key] as string;
      }
    }
  }

  return { projectsDir, projects, icons };
}

function validateProject(raw: unknown, index: number): Project {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Project at index ${index} must be an object`);
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    throw new Error(`Project at index ${index} must have a non-empty "name" string`);
  }

  if (typeof obj.path !== 'string' || obj.path.trim() === '') {
    throw new Error(`Project at index ${index} must have a non-empty "path" string`);
  }

  const project: Project = {
    name: obj.name.trim(),
    path: obj.path.trim(),
  };

  // Optional fields
  if (obj.env !== undefined) {
    if (typeof obj.env !== 'object' || obj.env === null || Array.isArray(obj.env)) {
      throw new Error(`Project "${project.name}": "env" must be an object`);
    }
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj.env as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        throw new Error(`Project "${project.name}": env value for "${key}" must be a string`);
      }
      env[key] = value;
    }
    project.env = env;
  }

  if (obj.kubectx !== undefined) {
    if (typeof obj.kubectx !== 'string') {
      throw new Error(`Project "${project.name}": "kubectx" must be a string`);
    }
    project.kubectx = obj.kubectx;
  }

  if (obj.gcloud !== undefined) {
    if (typeof obj.gcloud !== 'string') {
      throw new Error(`Project "${project.name}": "gcloud" must be a string`);
    }
    project.gcloud = obj.gcloud;
  }

  if (obj.aws !== undefined) {
    if (typeof obj.aws !== 'string') {
      throw new Error(`Project "${project.name}": "aws" must be a string`);
    }
    project.aws = obj.aws;
  }

  if (obj.azure !== undefined) {
    if (typeof obj.azure !== 'string') {
      throw new Error(`Project "${project.name}": "azure" must be a string`);
    }
    project.azure = obj.azure;
  }

  if (obj.venv !== undefined) {
    if (typeof obj.venv !== 'string') {
      throw new Error(`Project "${project.name}": "venv" must be a string`);
    }
    project.venv = obj.venv;
  }

  return project;
}

export function resolveProjectPath(projectsDir: string, projectPath: string): string {
  // If project path is absolute, use it directly
  if (isAbsolute(projectPath)) {
    return projectPath;
  }

  // Expand ~ in project path
  if (projectPath.startsWith('~')) {
    return join(homedir(), projectPath.slice(1));
  }

  // Otherwise, join with projectsDir
  return join(projectsDir, projectPath);
}
