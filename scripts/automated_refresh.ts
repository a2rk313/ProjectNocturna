import { getPostGISPool } from '../lib/database';
import fs from 'fs';
import path from 'path';

interface DataRefreshConfig {
  enabled: boolean;
  interval: {
    hours: number;
    minutes: number;
  };
  sources: {
    viirs: boolean;
    measurements: boolean;
    parks: boolean;
  };
  notifications: {
    email?: string;
    webhook?: string;
  };
}

interface RefreshTask {
  id: string;
  name: string;
  source: 'viirs' | 'measurements' | 'parks';
  schedule: string; // cron expression
  lastRun?: Date;
  nextRun: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: any;
}

class AutomatedDataRefresher {
  private config: DataRefreshConfig;
  private tasks: Map<string, RefreshTask> = new Map();
  private isRunning = false;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
    this.loadTasks();
  }

  private loadConfig(configPath?: string): DataRefreshConfig {
    const defaultConfig: DataRefreshConfig = {
      enabled: true,
      interval: {
        hours: 24,
        minutes: 0
      },
      sources: {
        viirs: true,
        measurements: true,
        parks: false // Parks don't change frequently
      },
      notifications: {}
    };

    if (configPath && fs.existsSync(configPath)) {
      try {
        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return { ...defaultConfig, ...userConfig };
      } catch (error) {
        console.warn('Invalid config file, using defaults:', error);
      }
    }

    return defaultConfig;
  }

  private loadTasks(): void {
    const tasksFile = 'data/refresh_tasks.json';
    
    if (fs.existsSync(tasksFile)) {
      try {
        const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
        tasksData.tasks?.forEach((task: RefreshTask) => {
          task.nextRun = new Date(task.nextRun);
          task.lastRun = task.lastRun ? new Date(task.lastRun) : undefined;
          this.tasks.set(task.id, task);
        });
      } catch (error) {
        console.warn('Failed to load tasks:', error);
      }
    }

    // Initialize default tasks if none exist
    if (this.tasks.size === 0) {
      this.initializeDefaultTasks();
    }
  }

  private initializeDefaultTasks(): void {
    const now = new Date();
    
    const defaultTasks: RefreshTask[] = [
      {
        id: 'viirs-nightly',
        name: 'VIIRS Nightly Data',
        source: 'viirs',
        schedule: '0 2 * * *', // 2 AM daily
        nextRun: this.calculateNextRun('0 2 * * *', now),
        status: 'pending',
        config: { product: 'nightly', daysBack: 1 }
      },
      {
        id: 'viirs-monthly',
        name: 'VIIRS Monthly Composite',
        source: 'viirs',
        schedule: '0 3 1 * *', // 3 AM on 1st of month
        nextRun: this.calculateNextRun('0 3 1 * *', now),
        status: 'pending',
        config: { product: 'monthly', previousMonth: true }
      },
      {
        id: 'measurements-cleanup',
        name: 'Measurements Data Cleanup',
        source: 'measurements',
        schedule: '0 1 * * 0', // 1 AM every Sunday
        nextRun: this.calculateNextRun('0 1 * * 0', now),
        status: 'pending',
        config: { action: 'cleanup', daysToKeep: 90 }
      }
    ];

    defaultTasks.forEach(task => this.tasks.set(task.id, task));
    this.saveTasks();
  }

  private calculateNextRun(cronExpression: string, from: Date): Date {
    // Simple cron parser for basic expressions
    // Real implementation would use a proper cron library
    const parts = cronExpression.split(' ');
    const [minute, hour, day, month, weekday] = parts.map(p => p === '*' ? null : parseInt(p));

    const next = new Date(from);
    
    if (minute !== null) next.setUTCMinutes(minute);
    if (hour !== null) next.setUTCHours(hour);
    if (day !== null) next.setUTCDate(day);
    if (month !== null) next.setUTCMonth(month - 1); // JS months are 0-indexed
    
    // If time has passed today, move to next valid occurrence
    if (next <= from) {
      next.setUTCDate(next.getUTCDate() + 1);
    }

    return next;
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Automated refresh is disabled');
      return;
    }

    if (this.isRunning) {
      console.log('Refresh service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting automated data refresh service...');

    while (this.isRunning) {
      const now = new Date();
      const readyTasks = Array.from(this.tasks.values())
        .filter(task => task.status === 'pending' && task.nextRun <= now);

      if (readyTasks.length > 0) {
        console.log(`Found ${readyTasks.length} tasks ready to run`);
        
        for (const task of readyTasks) {
          await this.executeTask(task);
        }
      }

      // Check again in 1 minute
      await this.sleep(60000);
    }
  }

  async executeTask(task: RefreshTask): Promise<void> {
    console.log(`Executing task: ${task.name}`);
    task.status = 'running';
    this.saveTasks();

    try {
      const startTime = Date.now();
      
      switch (task.source) {
        case 'viirs':
          await this.executeVIIRSTask(task);
          break;
        case 'measurements':
          await this.executeMeasurementsTask(task);
          break;
        case 'parks':
          await this.executeParksTask(task);
          break;
      }

      const duration = Date.now() - startTime;
      console.log(`Task ${task.name} completed in ${duration}ms`);

      // Update task
      task.lastRun = new Date();
      task.status = 'completed';
      task.nextRun = this.calculateNextRun(task.schedule, task.lastRun);
      
      await this.sendNotification(task, 'success', duration);

    } catch (error) {
      console.error(`Task ${task.name} failed:`, error);
      task.status = 'failed';
      task.nextRun = this.calculateNextRun(task.schedule, new Date(Date.now() + 3600000)); // Retry in 1 hour
      
      await this.sendNotification(task, 'error', 0, error);
    }

    this.saveTasks();
  }

  private async executeVIIRSTask(task: RefreshTask): Promise<void> {
    const { VIIRSIngestionPipeline } = await import('./viirs_pipeline');
    const pipeline = new VIIRSIngestionPipeline();

    if (task.config.product === 'nightly') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await pipeline.runFullPipeline(['nightly'], [yesterday.getFullYear()], {
        download: true,
        process: true,
        ingest: true
      });
    } else if (task.config.product === 'monthly') {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      await pipeline.runFullPipeline(['monthly'], [lastMonth.getFullYear()], {
        download: true,
        process: true,
        ingest: true
      });
    }
  }

  private async executeMeasurementsTask(task: RefreshTask): Promise<void> {
    const pool = getPostGISPool();

    if (task.config.action === 'cleanup') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - task.config.daysToKeep);

      const result = await pool.query(`
        DELETE FROM public.sqm_readings_enhanced
        WHERE measured_at < $1 AND quality_score < 50
      `, [cutoffDate]);

      console.log(`Cleaned up ${result.rowCount} low-quality measurements older than ${task.config.daysToKeep} days`);
    }
  }

  private async executeParksTask(task: RefreshTask): Promise<void> {
    const { ParksIngestionEngine } = await import('./enhanced_park_ingestion');
    const engine = new ParksIngestionEngine();

    // Check for updated dark sky places data
    // This would integrate with IDA or other official sources
    console.log('Checking for updated dark sky parks data...');
    
    // For now, just run statistics
    await engine.generateIngestionStats();
  }

  private async sendNotification(
    task: RefreshTask, 
    status: 'success' | 'error', 
    duration: number = 0, 
    error?: any
  ): Promise<void> {
    if (!this.config.notifications.email && !this.config.notifications.webhook) {
      return;
    }

    const message = {
      task: task.name,
      status,
      duration,
      timestamp: new Date().toISOString(),
      error: error?.message
    };

    if (this.config.notifications.webhook) {
      try {
        await fetch(this.config.notifications.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
      } catch (webhookError) {
        console.warn('Webhook notification failed:', webhookError);
      }
    }

    if (this.config.notifications.email) {
      // Email notification implementation would go here
      console.log('Email notification:', message);
    }
  }

  private saveTasks(): void {
    const tasksData = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      tasks: Array.from(this.tasks.values()).map(task => ({
        ...task,
        lastRun: task.lastRun?.toISOString(),
        nextRun: task.nextRun.toISOString()
      }))
    };

    fs.writeFileSync('data/refresh_tasks.json', JSON.stringify(tasksData, null, 2));
  }

  stop(): void {
    this.isRunning = false;
    console.log('Automated refresh service stopped');
  }

  getStatus(): any {
    return {
      running: this.isRunning,
      enabled: this.config.enabled,
      tasks: Array.from(this.tasks.values()).map(task => ({
        ...task,
        lastRun: task.lastRun?.toISOString(),
        nextRun: task.nextRun.toISOString()
      })),
      nextCheck: this.getNextCheckTime()
    };
  }

  private getNextCheckTime(): Date {
    const pendingTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'pending');
    
    if (pendingTasks.length === 0) {
      const next = new Date();
      next.setHours(next.getHours() + 1);
      return next;
    }

    return pendingTasks.reduce((earliest, task) => 
      task.nextRun < earliest ? task.nextRun : earliest
    , pendingTasks[0].nextRun);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async addTask(task: Omit<RefreshTask, 'id' | 'nextRun' | 'status'>): Promise<string> {
    const id = `custom-${Date.now()}`;
    const newTask: RefreshTask = {
      id,
      nextRun: this.calculateNextRun(task.schedule, new Date()),
      status: 'pending',
      ...task
    };

    this.tasks.set(id, newTask);
    this.saveTasks();
    
    console.log(`Added task: ${task.name} (${id})`);
    return id;
  }

  async removeTask(taskId: string): Promise<boolean> {
    const removed = this.tasks.delete(taskId);
    if (removed) {
      this.saveTasks();
      console.log(`Removed task: ${taskId}`);
    }
    return removed;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: bun run scripts/automated_refresh.ts <command> [options]');
    console.log('\\nCommands:');
    console.log('  start               Start the refresh service');
    console.log('  stop                Stop the refresh service');
    console.log('  status              Show current status');
    console.log('  add <cron> <name>  Add custom task');
    console.log('  remove <id>         Remove task');
    console.log('  run <id>            Run specific task now');
    console.log('\\nExamples:');
    console.log('  bun run scripts/automated_refresh.ts start');
    console.log('  bun run scripts/automated_refresh.ts add "0 */6 * * *" "My Custom Task"');
    process.exit(1);
  }

  const command = args[0];
  const refresher = new AutomatedDataRefresher('data/refresh_config.json');

  try {
    switch (command) {
      case 'start':
        await refresher.start();
        break;
        
      case 'stop':
        refresher.stop();
        break;
        
      case 'status':
        const status = refresher.getStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
        
      case 'add':
        const cron = args[1];
        const name = args.slice(2).join(' ');
        const taskId = await refresher.addTask({
          name,
          source: 'measurements',
          schedule: cron,
          config: {}
        });
        console.log(`Added task with ID: ${taskId}`);
        break;
        
      case 'remove':
        const removed = await refresher.removeTask(args[1]);
        console.log(removed ? 'Task removed' : 'Task not found');
        break;
        
      case 'run':
        const task = refresher['tasks'].get(args[1]);
        if (task) {
          await refresher.executeTask(task);
        } else {
          console.error('Task not found');
        }
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'production' && require.main === module) {
  main();
}

export { AutomatedDataRefresher, type DataRefreshConfig, type RefreshTask };
