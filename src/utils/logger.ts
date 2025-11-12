/**
 * Système de logging centralisé
 * Permet de contrôler les logs selon l'environnement
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enabled: boolean;
  minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private config: LogConfig;

  constructor() {
    // En production, on ne log que les erreurs
    // En développement, on log tout à partir de 'info'
    this.config = {
      enabled: true,
      minLevel: import.meta.env.DEV ? 'debug' : 'error'
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), data !== undefined ? data : '');
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), data !== undefined ? data : '');
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), data !== undefined ? data : '');
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error !== undefined ? error : '');
    }
  }

  /**
   * Groupe de logs (utile pour déboguer une séquence d'opérations)
   */
  group(title: string, callback: () => void): void {
    if (this.shouldLog('debug')) {
      console.group(title);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Log une table (utile pour les tableaux de données)
   */
  table(data: unknown): void {
    if (this.shouldLog('debug')) {
      console.table(data);
    }
  }

  /**
   * Désactive tous les logs (utile pour les tests)
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Réactive les logs
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Change le niveau minimum de log
   */
  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }
}

// Instance singleton du logger
export const logger = new Logger();

// Export des méthodes pour utilisation directe
export const { debug, info, warn, error, group, table } = logger;








