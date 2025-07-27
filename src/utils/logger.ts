/**
 * Komae Application Logger System
 * 
 * AI最適化ログシステム - TDD、デバッグ、ユーザー行動分析をサポート
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  operation: string;
  message: string;
  context: Record<string, any>;
  humanNote?: string;
  aiTodo?: string;
  sessionId?: string;
  correlationId?: string;
}

export class KomaeLogger {
  private logDir: string;
  private isDevelopment: boolean;
  private sessionId: string;

  constructor(projectName: string = 'komae') {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // ログファイルの保存場所を決定
    this.logDir = this.isDevelopment 
      ? path.join(process.cwd(), 'logs')
      : path.join(os.homedir(), '.komae', 'logs');
    
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // ログディレクトリを作成
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create log directory:', error);
    }
  }

  private async writeLogEntry(entry: LogEntry): Promise<void> {
    try {
      const logFileName = `komae-${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = path.join(this.logDir, logFileName);
      const logLine = JSON.stringify(entry) + '\n';
      
      await fs.appendFile(logFilePath, logLine, 'utf8');
    } catch (error) {
      console.warn('Failed to write log entry:', error);
    }
  }

  private createLogEntry(
    level: LogEntry['level'],
    operation: string,
    message: string,
    context: Record<string, any> = {},
    humanNote?: string,
    aiTodo?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      context: {
        ...context,
        environment: this.isDevelopment ? 'development' : 'production',
      },
      humanNote,
      aiTodo,
      sessionId: this.sessionId,
      correlationId: `${this.sessionId}_${Date.now()}`,
    };
  }

  /**
   * 開発・デバッグ用ログ
   */
  async logDevelopment(
    operation: string,
    description: string,
    context: Record<string, any> = {},
    humanNote?: string
  ): Promise<void> {
    const entry = this.createLogEntry(
      'info',
      `dev_${operation}`,
      description,
      context,
      humanNote || `Development tracking: ${operation}`,
      'Analyze development patterns and performance bottlenecks'
    );
    await this.writeLogEntry(entry);
  }

  /**
   * エラー追跡とTDD支援ログ
   */
  async logError(
    operation: string,
    error: Error | string,
    context: Record<string, any> = {},
    aiTodo?: string
  ): Promise<void> {
    const errorInfo = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : { message: String(error) };

    const entry = this.createLogEntry(
      'error',
      `error_${operation}`,
      'Operation failed',
      {
        ...context,
        error: errorInfo,
      },
      `Error occurred during ${operation}`,
      aiTodo || 'Analyze error patterns and suggest preventive measures'
    );
    await this.writeLogEntry(entry);
  }

  /**
   * UI操作とユーザー行動分析ログ
   */
  async logUserInteraction(
    action: string,
    component: string,
    context: Record<string, any> = {},
    humanNote?: string
  ): Promise<void> {
    const entry = this.createLogEntry(
      'info',
      `ui_${action}`,
      `User interaction: ${action}`,
      {
        component,
        ...context,
      },
      humanNote || `User performed ${action} in ${component}`,
      'Track user workflow patterns and identify UX improvements'
    );
    await this.writeLogEntry(entry);
  }

  /**
   * アセット管理操作ログ
   */
  async logAssetOperation(
    operation: 'import' | 'delete' | 'optimize' | 'validate',
    assetInfo: {
      id?: string;
      name?: string;
      filePath?: string;
      type?: string;
      size?: number;
    },
    context: Record<string, any> = {},
    success: boolean = true
  ): Promise<void> {
    const level = success ? 'info' : 'warning';
    
    const entry = this.createLogEntry(
      level,
      `asset_${operation}`,
      `Asset ${operation} ${success ? 'completed' : 'failed'}`,
      {
        asset: assetInfo,
        ...context,
        success,
      },
      `Asset ${operation} operation tracking`,
      'Monitor asset management efficiency and identify optimization opportunities'
    );
    await this.writeLogEntry(entry);
  }

  /**
   * プロジェクト操作ログ
   */
  async logProjectOperation(
    operation: 'create' | 'save' | 'load' | 'export',
    projectInfo: {
      path?: string;
      name?: string;
      format?: string;
      size?: number;
    },
    context: Record<string, any> = {},
    success: boolean = true
  ): Promise<void> {
    const level = success ? 'info' : 'error';
    
    const entry = this.createLogEntry(
      level,
      `project_${operation}`,
      `Project ${operation} ${success ? 'completed' : 'failed'}`,
      {
        project: projectInfo,
        ...context,
        success,
      },
      `Project ${operation} operation tracking`,
      'Analyze project workflow efficiency and detect issues'
    );
    await this.writeLogEntry(entry);
  }

  /**
   * パフォーマンス測定ログ
   */
  async logPerformance(
    operation: string,
    duration: number,
    context: Record<string, any> = {}
  ): Promise<void> {
    const entry = this.createLogEntry(
      'info',
      `perf_${operation}`,
      `Performance measurement: ${operation}`,
      {
        ...context,
        duration,
        unit: 'milliseconds',
      },
      `Performance tracking for ${operation}`,
      'Identify performance bottlenecks and optimization opportunities'
    );
    await this.writeLogEntry(entry);
  }

  /**
   * TDDテスト結果ログ
   */
  async logTestResult(
    testName: string,
    success: boolean,
    context: Record<string, any> = {},
    errorDetails?: string
  ): Promise<void> {
    const level = success ? 'info' : 'warning';
    
    const entry = this.createLogEntry(
      level,
      `test_${testName}`,
      `Test ${success ? 'passed' : 'failed'}: ${testName}`,
      {
        ...context,
        success,
        errorDetails,
      },
      'TDD test execution tracking',
      success 
        ? 'Monitor test coverage and quality'
        : 'Analyze test failures and suggest fixes'
    );
    await this.writeLogEntry(entry);
  }

  /**
   * システム情報とデバッグログ
   */
  async logSystemInfo(
    context: Record<string, any> = {}
  ): Promise<void> {
    const entry = this.createLogEntry(
      'info',
      'system_info',
      'System information snapshot',
      {
        ...context,
        system: {
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          memory: process.memoryUsage(),
          uptime: process.uptime(),
        },
      },
      'System state monitoring',
      'Monitor system health and resource usage patterns'
    );
    await this.writeLogEntry(entry);
  }

  /**
   * ログファイルの手動フラッシュ
   */
  async flush(): Promise<void> {
    // 現在の実装では同期的に書き込むため特別な処理不要
  }

  /**
   * ロガーの終了処理
   */
  async close(): Promise<void> {
    await this.flush();
  }
}

// グローバルロガーインスタンス
let globalLogger: KomaeLogger | null = null;

/**
 * グローバルロガーインスタンスを取得
 */
export function getLogger(): KomaeLogger {
  if (!globalLogger) {
    globalLogger = new KomaeLogger();
  }
  return globalLogger;
}

/**
 * パフォーマンス測定ヘルパー
 */
export class PerformanceTracker {
  private startTime: number;
  private operation: string;
  private logger: KomaeLogger;

  constructor(operation: string, logger?: KomaeLogger) {
    this.operation = operation;
    this.logger = logger || getLogger();
    this.startTime = performance.now();
  }

  async end(context: Record<string, any> = {}): Promise<number> {
    const duration = performance.now() - this.startTime;
    await this.logger.logPerformance(this.operation, duration, context);
    return duration;
  }
}

/**
 * パフォーマンス測定デコレータ
 */
export function logPerformance(operation?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const tracker = new PerformanceTracker(operationName);
      try {
        const result = await method.apply(this, args);
        await tracker.end({ success: true });
        return result;
      } catch (error) {
        await tracker.end({ success: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    };

    return descriptor;
  };
}

// グローバル型定義の拡張
declare global {
  var __komaeSessionId: string;
}