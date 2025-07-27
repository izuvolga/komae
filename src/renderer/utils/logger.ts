/**
 * Renderer Process Logger Bridge
 * 
 * メインプロセスのログ機能をレンダラープロセスから使用するためのブリッジ
 */

export interface RendererLogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export class RendererLogger {
  private sessionId: string;

  constructor() {
    // セッションIDを生成（ページリロード時に更新）
    this.sessionId = `renderer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * UI操作ログ
   */
  async logUserInteraction(
    action: string,
    component: string,
    context: RendererLogContext = {}
  ): Promise<void> {
    try {
      // Electron IPC経由でメインプロセスのログ機能を呼び出し
      await window.electronAPI?.logger?.logUserInteraction(action, component, {
        ...context,
        sessionId: this.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // ログ失敗時はコンソールに出力（デバッグ用）
      console.warn('Failed to log user interaction:', error);
    }
  }

  /**
   * UI エラーログ
   */
  async logError(
    operation: string,
    error: Error | string,
    context: RendererLogContext = {}
  ): Promise<void> {
    try {
      await window.electronAPI?.logger?.logError(operation, error, {
        ...context,
        sessionId: this.sessionId,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
      console.error('Original error:', error);
    }
  }

  /**
   * 開発ログ
   */
  async logDevelopment(
    operation: string,
    description: string,
    context: RendererLogContext = {}
  ): Promise<void> {
    try {
      await window.electronAPI?.logger?.logDevelopment(operation, description, {
        ...context,
        sessionId: this.sessionId,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to log development info:', error);
    }
  }

  /**
   * パフォーマンス測定
   */
  async logPerformance(
    operation: string,
    duration: number,
    context: RendererLogContext = {}
  ): Promise<void> {
    try {
      await window.electronAPI?.logger?.logPerformance(operation, duration, {
        ...context,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to log performance:', error);
    }
  }
}

// グローバルインスタンス
let globalRendererLogger: RendererLogger | null = null;

/**
 * レンダラープロセス用のロガーインスタンスを取得
 */
export function getRendererLogger(): RendererLogger {
  if (!globalRendererLogger) {
    globalRendererLogger = new RendererLogger();
  }
  return globalRendererLogger;
}

/**
 * React Hook用のパフォーマンストラッカー
 */
export class UIPerformanceTracker {
  private startTime: number;
  private operation: string;
  private logger: RendererLogger;

  constructor(operation: string, logger?: RendererLogger) {
    this.operation = operation;
    this.logger = logger || getRendererLogger();
    this.startTime = performance.now();
  }

  async end(context: RendererLogContext = {}): Promise<number> {
    const duration = performance.now() - this.startTime;
    await this.logger.logPerformance(this.operation, duration, context);
    return duration;
  }
}

/**
 * React Component用のエラーバウンダリーログ
 */
export function logComponentError(
  componentName: string,
  error: Error,
  errorInfo: any,
  context: RendererLogContext = {}
): void {
  const logger = getRendererLogger();
  logger.logError(`component_error_${componentName}`, error, {
    ...context,
    component: componentName,
    errorInfo: {
      componentStack: errorInfo.componentStack,
    },
  }).catch(logError => {
    console.error('Failed to log component error:', logError);
  });
}

// ElectronAPI型の拡張は preload.ts で行うため、ここでは削除