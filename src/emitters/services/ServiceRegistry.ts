import { ShellAdapter } from '../ShellAdapter.js';
import { KubernetesService } from './KubernetesService.js';
import { GCloudService } from './GCloudService.js';
import { AWSService } from './AWSService.js';
import { AzureService } from './AzureService.js';
import { VenvService } from './VenvService.js';
import { PathService } from './PathService.js';

// Service registry - source of truth for all service metadata
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, { label: string; color: string }>;

  private constructor() {
    // Create a dummy shell adapter just to instantiate services for metadata
    const shell = ShellAdapter.create('sh');

    const k8s = new KubernetesService(shell);
    const gcloud = new GCloudService(shell);
    const aws = new AWSService(shell);
    const azure = new AzureService(shell);
    const venv = new VenvService(shell, 'sh');
    const path = new PathService(shell);

    this.services = new Map([
      ['k8s', { label: k8s.getLabel(), color: k8s.getColor() }],
      ['gcp', { label: gcloud.getLabel(), color: gcloud.getColor() }],
      ['aws', { label: aws.getLabel(), color: aws.getColor() }],
      ['azure', { label: azure.getLabel(), color: azure.getColor() }],
      ['venv', { label: venv.getLabel(), color: venv.getColor() }],
      ['path', { label: path.getLabel(), color: path.getColor() }],
    ]);
  }

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  getColor(service: string): string {
    return this.services.get(service)?.color || '#AAAAAA';
  }

  getLabel(service: string): string {
    return this.services.get(service)?.label || service;
  }

  getAllServices(): string[] {
    return Array.from(this.services.keys());
  }
}

// Convenience function for getting colors
export function getServiceColor(service: string): string {
  return ServiceRegistry.getInstance().getColor(service);
}
