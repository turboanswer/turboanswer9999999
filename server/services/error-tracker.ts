export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorType = 'uncaughtException' | 'unhandledRejection' | 'routeError' | 'dbError' | 'aiError' | 'paypalError' | 'authError' | 'unknown';

export interface TrackedError {
  id: string;
  timestamp: string;
  type: ErrorType;
  message: string;
  stack?: string;
  route?: string;
  severity: ErrorSeverity;
  resolved: boolean;
  autoFixAttempted: boolean;
  autoFixResult?: string;
  occurrences: number;
  lastSeen: string;
}

const errorLog: TrackedError[] = [];
const MAX_ERRORS = 200;

const errorFingerprints = new Map<string, string>();

function fingerprint(type: ErrorType, message: string): string {
  return `${type}::${message.substring(0, 120)}`;
}

function classifySeverity(type: ErrorType, message: string): ErrorSeverity {
  if (type === 'uncaughtException' || type === 'unhandledRejection') return 'critical';
  if (type === 'dbError') return 'high';
  if (message.toLowerCase().includes('cannot read') || message.toLowerCase().includes('is not a function')) return 'high';
  if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('429')) return 'low';
  if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('econnrefused')) return 'medium';
  if (type === 'aiError' || type === 'paypalError') return 'medium';
  if (type === 'authError') return 'low';
  return 'low';
}

export function trackError(
  type: ErrorType,
  message: string,
  options: { stack?: string; route?: string } = {}
): TrackedError {
  const fp = fingerprint(type, message);
  const existingId = errorFingerprints.get(fp);

  if (existingId) {
    const existing = errorLog.find(e => e.id === existingId);
    if (existing) {
      existing.occurrences++;
      existing.lastSeen = new Date().toISOString();
      return existing;
    }
  }

  const err: TrackedError = {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    type,
    message: message.substring(0, 500),
    stack: options.stack?.substring(0, 1000),
    route: options.route,
    severity: classifySeverity(type, message),
    resolved: false,
    autoFixAttempted: false,
    occurrences: 1,
  };

  errorLog.push(err);
  errorFingerprints.set(fp, err.id);

  if (errorLog.length > MAX_ERRORS) {
    const removed = errorLog.splice(0, errorLog.length - MAX_ERRORS);
    removed.forEach(e => errorFingerprints.delete(fingerprint(e.type, e.message)));
  }

  return err;
}

export function resolveError(id: string, autoFixResult?: string): void {
  const err = errorLog.find(e => e.id === id);
  if (err) {
    err.resolved = true;
    err.autoFixAttempted = true;
    err.autoFixResult = autoFixResult;
  }
}

export function getErrorLog(): TrackedError[] {
  return [...errorLog].reverse();
}

export function getErrorStats() {
  const total = errorLog.length;
  const unresolved = errorLog.filter(e => !e.resolved).length;
  const critical = errorLog.filter(e => e.severity === 'critical' && !e.resolved).length;
  const high = errorLog.filter(e => e.severity === 'high' && !e.resolved).length;
  const byType = errorLog.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return { total, unresolved, critical, high, byType };
}

export function clearResolvedErrors(): number {
  const before = errorLog.length;
  const toRemove = errorLog.filter(e => e.resolved).map(e => e.id);
  toRemove.forEach(id => {
    const idx = errorLog.findIndex(e => e.id === id);
    if (idx !== -1) {
      const e = errorLog[idx];
      errorFingerprints.delete(fingerprint(e.type, e.message));
      errorLog.splice(idx, 1);
    }
  });
  return before - errorLog.length;
}

export function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (err) => {
    console.error('[ErrorTracker] Uncaught Exception:', err.message);
    trackError('uncaughtException', err.message, { stack: err.stack });
  });

  process.on('unhandledRejection', (reason: any) => {
    const message = reason?.message || String(reason);
    console.error('[ErrorTracker] Unhandled Rejection:', message);
    trackError('unhandledRejection', message, { stack: reason?.stack });
  });

  console.log('[ErrorTracker] Global error handlers installed');
}
