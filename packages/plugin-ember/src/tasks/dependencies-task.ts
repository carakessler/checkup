import { BaseTask, TaskResult, getPackageJson } from '@checkup/core';

import { DependenciesTaskResult } from '../results';
import { PackageJson } from 'type-fest';

function findDependency(packageJson: PackageJson, key: string): string {
  return (
    (packageJson.dependencies && packageJson.dependencies[key]) ||
    (packageJson.devDependencies && packageJson.devDependencies[key]) ||
    'Not found'
  );
}

function findDependencies(
  dependencies: PackageJson.Dependency | undefined,
  filter: (dependency: string) => boolean
) {
  if (typeof dependencies === 'undefined') {
    return {};
  }

  return Object.entries(dependencies).reduce((orig: Record<string, string>, pair) => {
    let [key, value] = pair;

    if (filter(key)) {
      orig[key] = value;
    }

    return orig;
  }, {});
}

function emberAddonFilter(dependency: string) {
  return dependency.startsWith('ember-') && !dependency.startsWith('ember-cli');
}

function emberCliAddonFilter(dependency: string) {
  return dependency.startsWith('ember-cli');
}

export default class DependenciesTask extends BaseTask {
  static taskName: string = 'dependencies';
  static friendlyTaskName: string = 'Project Dependencies';

  async run(): Promise<TaskResult> {
    let result: DependenciesTaskResult = new DependenciesTaskResult();
    let packageJson = getPackageJson(this.args.path);

    result.emberLibraries['ember-source'] = findDependency(packageJson, 'ember-source');
    result.emberLibraries['ember-cli'] = findDependency(packageJson, 'ember-cli');
    result.emberLibraries['ember-data'] = findDependency(packageJson, 'ember-data');
    result.emberAddons = {
      dependencies: findDependencies(packageJson.dependencies, emberAddonFilter),
      devDependencies: findDependencies(packageJson.devDependencies, emberAddonFilter),
    };

    result.emberCliAddons = {
      dependencies: findDependencies(packageJson.dependencies, emberCliAddonFilter),
      devDependencies: findDependencies(packageJson.devDependencies, emberCliAddonFilter),
    };

    return result;
  }
}
