import * as path from 'path';

import { Command, flags } from '@oclif/command';
import {
  TaskConstructor,
  TaskName,
  TaskResult,
  getConfig,
  getPackageJson,
  loadPlugins,
  ui,
} from '@checkup/core';
import { getRegisteredParsers, registerParser } from './parsers';
import { getRegisteredTasks, registerTask } from './tasks';

import TaskList from './task-list';

function mergeTaskResults(taskResults: TaskResult[]) {
  let mergedResults = {};

  taskResults.forEach(taskResult => {
    mergedResults = Object.assign(mergedResults, taskResult.toJson());
  });

  return mergedResults;
}

class Checkup extends Command {
  static description = 'A CLI that provides health check information about your project';

  static args = [
    {
      name: 'path',
      required: true,
      description: 'The path referring to the root directory that Checkup will run in',
      default: '.',
    },
  ];

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    force: flags.boolean({ char: 'f' }),
    silent: flags.boolean({ char: 's' }),
    json: flags.boolean(),
    task: flags.string({ char: 't' }),
  };

  async run() {
    let { args, flags } = this.parse(Checkup);
    let registeredTasks: Map<TaskName, TaskConstructor>;
    const checkupConfig = await getConfig(args.path);
    const plugins = await loadPlugins(checkupConfig.plugins, args.path);
    this.config.plugins.push(...plugins);

    try {
      getPackageJson(args.path);
    } catch (error) {
      this.error(
        `The ${path.resolve(
          args.path
        )} directory found through the 'path' option does not contain a package.json file. You must run checkup in a directory with a package.json file.`,
        error
      );
    }

    await this.config.runHook('register-parsers', {
      registerParser,
    });

    await this.config.runHook('register-tasks', {
      parsers: getRegisteredParsers(),
      registerTask,
    });

    registeredTasks = getRegisteredTasks();

    let taskResults;
    let tasksToBeRun = new TaskList();

    if (flags.task !== undefined) {
      let task = registeredTasks.get(flags.task);

      if (task !== undefined) {
        tasksToBeRun.addTask(task, args);
      }
    } else {
      tasksToBeRun.addTasks([...registeredTasks.values()], args);
    }

    ui.action.start('Checking up on your project');

    taskResults = await tasksToBeRun.runTasks();

    if (!flags.silent) {
      if (flags.json) {
        ui.styledJSON(mergeTaskResults(taskResults));
      } else {
        taskResults.forEach(taskResult => taskResult.toConsole());
      }
    }

    ui.action.stop();
  }
}

export = Checkup;
