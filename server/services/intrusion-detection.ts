import type { Request, Response, NextFunction } from 'express';

export type ThreatType =
  | 'ddos'
  | 'brute_force'
  | 'scanning'
  | 'injection'
  | 'data_breach'
  | 'security_breach'
  | 'simulated_hack'
  | 'simulated_ddos'
  | 'simulated_breach';

export interface IntrusionEvent {
  id: number;
  timestamp: Date;
  type: ThreatType;
  ip: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
  simulated: boolean;
}

interface IPData {
  requests: number[];
  failedAuths: number[];
  notFounds: number[];
  blocked: boolean;
  blockedAt?: Date;
}

const ipData = new Map<string, IPData>();
const intrusionLog: IntrusionEvent[] = [];
let eventCounter = 0;

let onCriticalThreat: ((scenario: string, reason: string) => void) | null = null;

export function setThreatCallback(cb: (scenario: string, reason: string) => void) {
  onCriticalThreat = cb;
}

function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function now() { return Date.now(); }

function prune(arr: number[], windowMs: number): number[] {
  const cutoff = now() - windowMs;
  return arr.filter(t => t > cutoff);
}

function addEvent(event: Omit<IntrusionEvent, 'id'>): IntrusionEvent {
  const ev: IntrusionEvent = { ...event, id: ++eventCounter };
  intrusionLog.unshift(ev);
  if (intrusionLog.length > 300) intrusionLog.pop();
  const label = ev.simulated ? '[SIMULATED]' : '';
  console.log(`[Security${label}] ${ev.severity.toUpperCase()} — ${ev.type} from ${ev.ip}: ${ev.details}`);
  return ev;
}

// ── Detection patterns ────────────────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /(\bUNION\b[\s\S]{0,20}\bSELECT\b)/i,
  /('\s*(OR|AND)\s*'[^']*'\s*=\s*'[^']*')/i,
  /('\s*(OR|AND)\s+\d+\s*=\s*\d+)/i,
  /\b(DROP\s+TABLE|DELETE\s+FROM|TRUNCATE\s+TABLE|ALTER\s+TABLE)\b/i,
  /<script[\s>]/i,
  /javascript\s*:/i,
  /\bon(error|load|click|mouseover)\s*=/i,
  /\beval\s*\(/i,
  /document\.(cookie|write|location)/i,
  /(\.\.\/){2,}|(\/etc\/passwd|\/proc\/self|\/windows\/system32)/i,
  /\b(cmd\.exe|powershell|bash|sh)\b/i,
];

function checkInjection(str: string): boolean {
  if (!str || str.length < 4) return false;
  return INJECTION_PATTERNS.some(p => p.test(str));
}

function scanRequest(req: Request): boolean {
  const parts = [
    req.path,
    JSON.stringify(req.query ?? {}),
  ];
  if (req.body && typeof req.body === 'object') {
    parts.push(JSON.stringify(req.body));
  } else if (typeof req.body === 'string') {
    parts.push(req.body);
  }
  return parts.some(checkInjection);
}

// ── Middleware ────────────────────────────────────────────────────────────────
export function applyIntrusionMiddleware(app: any) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const t = now();

    // Skip health-check and static paths
    if (!req.path.startsWith('/api') && !req.path.startsWith('/widget')) return next();

    if (!ipData.has(ip)) {
      ipData.set(ip, { requests: [], failedAuths: [], notFounds: [], blocked: false });
    }
    const data = ipData.get(ip)!;

    data.requests  = prune(data.requests,  60_000);
    data.notFounds = prune(data.notFounds, 60_000);
    data.failedAuths = prune(data.failedAuths, 300_000);

    // Already blocked
    if (data.blocked) {
      res.status(429).json({ error: 'Your IP has been blocked due to suspicious activity.' });
      return;
    }

    data.requests.push(t);

    // ── DDoS: >100 req/min ────────────────────────────────────────────────────
    if (data.requests.length > 100) {
      data.blocked = true;
      data.blockedAt = new Date();
      addEvent({
        timestamp: new Date(), type: 'ddos', ip,
        details: `${data.requests.length} requests in 60s — DDoS threshold exceeded`,
        severity: 'critical', blocked: true, simulated: false,
      });
      if (onCriticalThreat) onCriticalThreat('system_failure', `DDoS from ${ip}`);
      res.status(429).json({ error: 'Rate limit exceeded.' });
      return;
    }

    // ── Injection: SQL/XSS patterns ───────────────────────────────────────────
    const skipInjectionPaths = ['/api/upload', '/api/image', '/api/admin/chat', '/api/chat'];
    const skipInjection = skipInjectionPaths.some(p => req.path.startsWith(p)) || req.method === 'OPTIONS';
    if (!skipInjection && scanRequest(req)) {
      data.blocked = true;
      data.blockedAt = new Date();
      addEvent({
        timestamp: new Date(), type: 'injection', ip,
        details: `Injection pattern on ${req.method} ${req.path}`,
        severity: 'critical', blocked: true, simulated: false,
      });
      if (onCriticalThreat) onCriticalThreat('security_breach', `Injection attack from ${ip}`);
      res.status(403).json({ error: 'Request blocked.' });
      return;
    }

    // ── Post-response tracking ─────────────────────────────────────────────────
    res.on('finish', () => {
      // 404 scanning
      if (res.statusCode === 404) {
        data.notFounds.push(t);
        if (data.notFounds.length > 30) {
          addEvent({
            timestamp: new Date(), type: 'scanning', ip,
            details: `${data.notFounds.length} 404s in 60s — automated directory scanner`,
            severity: 'medium', blocked: false, simulated: false,
          });
          data.notFounds = [];
        }
      }

      // Brute force: failed auth
      if (res.statusCode === 401 && (req.path.includes('/auth') || req.path.includes('/login'))) {
        data.failedAuths.push(t);
        if (data.failedAuths.length > 10) {
          data.blocked = true;
          data.blockedAt = new Date();
          addEvent({
            timestamp: new Date(), type: 'brute_force', ip,
            details: `${data.failedAuths.length} failed auth attempts in 5 min — brute force`,
            severity: 'high', blocked: true, simulated: false,
          });
          data.failedAuths = [];
        }
      }
    });

    next();
  });
}

// ── Admin accessors ────────────────────────────────────────────────────────────
export function getIntrusionLog(): IntrusionEvent[] {
  return intrusionLog;
}

export function getIntrusionStats() {
  const since1h = Date.now() - 3_600_000;
  const recent = intrusionLog.filter(e => e.timestamp.getTime() > since1h);
  const blocked = [...ipData.entries()]
    .filter(([, d]) => d.blocked)
    .map(([ip, d]) => ({ ip, blockedAt: d.blockedAt ?? null }));

  const reqLastMin = [...ipData.values()].reduce((sum, d) => sum + d.requests.length, 0);

  return {
    totalEvents: intrusionLog.length,
    eventsLast1h: recent.length,
    blockedIPCount: blocked.length,
    blockedIPs: blocked,
    requestsLastMinute: reqLastMin,
    threatBreakdown: {
      ddos:        recent.filter(e => e.type === 'ddos').length,
      brute_force: recent.filter(e => e.type === 'brute_force').length,
      scanning:    recent.filter(e => e.type === 'scanning').length,
      injection:   recent.filter(e => e.type === 'injection').length,
      simulated:   recent.filter(e => e.simulated).length,
    },
  };
}

export function unblockIP(ip: string): boolean {
  const d = ipData.get(ip);
  if (!d) return false;
  d.blocked = false;
  d.blockedAt = undefined;
  return true;
}

// ── Simulate threat ────────────────────────────────────────────────────────────
const SIMULATIONS: Record<string, {
  type: ThreatType; details: string; severity: IntrusionEvent['severity']; scenario: string;
}> = {
  ddos: {
    type: 'ddos',
    details: '1,240 requests/min from distributed botnet across 47 IPs [SIMULATED]',
    severity: 'critical', scenario: 'system_failure',
  },
  brute_force: {
    type: 'brute_force',
    details: '200 failed admin login attempts via credential stuffing in 90s [SIMULATED]',
    severity: 'high', scenario: 'security_breach',
  },
  injection: {
    type: 'injection',
    details: "SQL injection: ' UNION SELECT username,password FROM users-- on /api/auth [SIMULATED]",
    severity: 'critical', scenario: 'security_breach',
  },
  data_breach: {
    type: 'data_breach',
    details: 'Bulk data exfiltration: 15,000 user records downloaded via /api/admin/users [SIMULATED]',
    severity: 'critical', scenario: 'security_breach',
  },
  scanning: {
    type: 'scanning',
    details: '450 directory probe requests in 30s — automated vulnerability scanner (nikto) [SIMULATED]',
    severity: 'medium', scenario: 'malfunction',
  },
  hack: {
    type: 'security_breach',
    details: 'Admin session hijacked via stolen JWT — unauthorized write access to /api/admin [SIMULATED]',
    severity: 'critical', scenario: 'security_breach',
  },
};

export function simulateThreat(type: string): { scenario: string; event: IntrusionEvent } {
  const cfg = SIMULATIONS[type] ?? SIMULATIONS.hack;
  const fakeIP = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const event = addEvent({
    timestamp: new Date(), type: cfg.type, ip: fakeIP,
    details: cfg.details, severity: cfg.severity, blocked: true, simulated: true,
  });
  return { scenario: cfg.scenario, event };
}
