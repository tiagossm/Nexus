// ============================================
// Logger Customizado - Dev Only
// ============================================
// Remove console.logs em produção automaticamente

type LogLevel = 'log' | 'warn' | 'error' | 'info';

class Logger {
    private isDev = process.env.NODE_ENV !== 'production';

    log(...args: any[]) {
        if (this.isDev) {
            console.log('[LOG]', ...args);
        }
    }

    info(...args: any[]) {
        if (this.isDev) {
            console.info('[INFO]', ...args);
        }
    }

    warn(...args: any[]) {
        // Warnings sempre aparecem
        console.warn('[WARN]', ...args);
    }

    error(...args: any[]) {
        // Errors sempre aparecem
        console.error('[ERROR]', ...args);
    }

    debug(...args: any[]) {
        if (this.isDev) {
            console.debug('[DEBUG]', ...args);
        }
    }

    // Helper para objetos grandes
    table(data: any) {
        if (this.isDev) {
            console.table(data);
        }
    }
}

export const logger = new Logger();
