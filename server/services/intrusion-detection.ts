import type { Request, Response, NextFunction } from 'express';
import { redisSet, redisGet, redisDel } from '../redis';

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

const intrusionLog: IntrusionEvent[] = [];
let eventCounter = 0;

// Local fast-access Map — kept for synchronous middleware reads/writes.
const ipData = new Map<string, IPData>();

// Redis cross-instance sync (best-effort; never blocks the request path)
const REDIS_IP_PREFIX = 'intrusion:ip:';
const REDIS_TTL = 3600;

function syncToRedis(ip: string, data: IPData): void {
  redisSet(
    `${REDIS_IP_PREFIX}${ip}`,
    JSON.stringify({
      requests: data.requests,
      failedAuths: data.failedAuths,
      notFounds: data.notFounds,
      blocked: data.blocked,
      blockedAt: data.blockedAt ? data.blockedAt.toISOString() : undefined,
    }),
    REDIS_TTL
  ).catch(() => {
    /* best-effort; never crash the request path */
  });
}

function unsyncFromRedis(ip: string): void {
  redisDel(`${REDIS_IP_PREFIX}${ip}`).catch(() => {
    /* best-effort */
  });
}

async function hydrateIPFromRedis(ip: string): Promise<void> {
  if (ipData.has(ip)) return;
  const raw = await redisGet(`${REDIS_IP_PREFIX}${ip}`);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const data: IPData = {
      requests: parsed.requests || [],
      failedAuths: parsed.failedAuths || [],
      notFounds: parsed.notFounds || [],
      blocked: parsed.blocked || false,
      blockedAt: parsed.blockedAt ? new Date(parsed.blockedAt) : undefined,
    };
    ipData.set(ip, data);
  } catch {
    /* best-effort */
  }
}

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
  /\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET)\b/i,
  /\b(EXEC\s*\(|EXECUTE\s+)/i,
  /\b(WAITFOR\s+DELAY|BENCHMARK\s*\(|SLEEP\s*\()/i,
  /\b(INTO\s+(OUT|DUMP)FILE)/i,
  /\b(INFORMATION_SCHEMA|pg_catalog|pg_tables|sys\.objects)\b/i,
  /<script[\s>]/i,
  /javascript\s*:/i,
  /\bon(error|load|click|mouseover|focus|blur|submit)\s*=/i,
  /\beval\s*\(/i,
  /document\.(cookie|write|location)/i,
  /window\.(location|open)\s*[=(]/i,
  /(\.\.\/){2,}|(\.\.\\){2,}/i,
  /(\/etc\/(passwd|shadow|hosts)|\/proc\/(self|version)|\/windows\/system32)/i,
  /\b(cmd\.exe|powershell|bash\s+-[ci])\b/i,
  /(%00|%0d%0a|%0a|%0d)/i,
  /\{\{.*\}\}|\$\{.*\}/,
  /<\s*(iframe|object|embed|applet|form|meta|link)\b/i,
  /\bdata\s*:\s*text\/html/i,
  /\bimport\s*\(.*\)/i,
  /\brequire\s*\(.*\)/i,
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
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const t = now();

    // Skip health-check and static paths
    if (!req.path.startsWith('/api') && !req.path.startsWith('/widget')) return next();

    if (!ipData.has(ip)) {
      await hydrateIPFromRedis(ip);
    }
    if (!ipData.has(ip)) {
      ipData.set(ip, { requests: [], failedAuths: [], notFounds: [], blocked: false });
    }
    const data = ipData.get(ip)!;
    syncToRedis(ip, data);

    data.requests  = prune(data.requests,  60_000);
    data.notFounds = prune(data.notFounds, 60_000);
    data.failedAuths = prune(data.failedAuths, 300_000);

    // Already blocked — auto-unblock after 10 minutes to prevent false-positive lockouts
    if (data.blocked) {
      const blockedMs = data.blockedAt ? (Date.now() - data.blockedAt.getTime()) : Infinity;
      if (blockedMs > 10 * 60 * 1000) {
        data.blocked = false;
        data.blockedAt = undefined;
        data.requests = [];
        data.failedAuths = [];
        data.notFounds = [];
        syncToRedis(ip, data);
      } else {
        res.status(429).json({ error: 'Your IP has been blocked due to suspicious activity. Please try again in a few minutes.' });
        return;
      }
    }

    data.requests.push(t);

    // ── DDoS: >300 req/min ────────────────────────────────────────────────────
    if (data.requests.length > 300) {
      data.blocked = true;
      data.blockedAt = new Date();
      syncToRedis(ip, data);
      addEvent({
        timestamp: new Date(), type: 'ddos', ip,
        details: `${data.requests.length} requests in 60s — DDoS threshold (300/min) exceeded`,
        severity: 'critical', blocked: true, simulated: false,
      });
      if (onCriticalThreat) onCriticalThreat('system_failure', `DDoS from ${ip}`);
      res.status(429).json({ error: 'Rate limit exceeded.' });
      return;
    }

    // ── Injection: SQL/XSS patterns ───────────────────────────────────────────
    const skipInjectionPaths = [
      '/api/upload', '/api/image', '/api/admin/chat', '/api/chat',
      '/api/conversations', '/api/messages', '/api/ai', '/api/photo-editor',
      '/api/video', '/api/code', '/api/crisis', '/api/media',
    ];
    const skipInjection = skipInjectionPaths.some(p => req.path.startsWith(p)) || req.method === 'OPTIONS';
    if (!skipInjection && scanRequest(req)) {
      data.blocked = true;
      data.blockedAt = new Date();
      syncToRedis(ip, data);
      addEvent({
        timestamp: new Date(), type: 'injection', ip,
        details: `Injection pattern on ${req.method} ${req.path}`,
        severity: 'critical', blocked: true, simulated: false,
      });
      if (onCriticalThreat) onCriticalThreat('security_breach', `Injection attack from ${ip}`);
      res.status(403).json({ error: 'Request blocked.' });
      return;
    }

    const BLOCKED_PATHS = [
      /\.(env|git|svn|htaccess|htpasswd|DS_Store|bak|old|orig|swp|sql|log|ini|conf|cfg|yml|yaml|toml|xml|php|asp|aspx|jsp|cgi|pl)$/i,
      /\/(\.git|\.svn|\.env|\.aws|\.ssh|\.docker|\.kube|\.npm|\.vscode|node_modules|vendor|wp-admin|wp-content|wp-includes|phpmyadmin|adminer|phpinfo|debug|trace|test|backup|dump)\b/i,
      /\/\.(well-known\/)?acme-challenge/i,
      /\/(config|configuration|settings|setup|install|database|db|mysql|mssql|oracle|redis|mongo|elastic|kibana)\.(json|yaml|yml|xml|ini|conf|cfg|php|py|js|rb)$/i,
    ];
    if (BLOCKED_PATHS.some(p => p.test(req.path))) {
      data.notFounds.push(t);
      addEvent({
        timestamp: new Date(), type: 'scanning', ip,
        details: `Blocked path probe: ${req.method} ${req.path}`,
        severity: 'medium', blocked: true, simulated: false,
      });
      if (data.notFounds.length > 10) {
        data.blocked = true;
        data.blockedAt = new Date();
      }
      syncToRedis(ip, data);
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const BLOCKED_UA = /\b(sqlmap|nikto|nmap|dirbuster|gobuster|wfuzz|ffuf|nuclei|burpsuite|havij|acunetix|nessus|openvas|w3af|arachni|skipfish|masscan|zap|owasp)\b/i;
    const userAgent = req.get('user-agent') || '';
    if (BLOCKED_UA.test(userAgent)) {
      data.blocked = true;
      data.blockedAt = new Date();
      syncToRedis(ip, data);
      addEvent({
        timestamp: new Date(), type: 'scanning', ip,
        details: `Blocked hacking tool UA: ${userAgent.substring(0, 80)}`,
        severity: 'high', blocked: true, simulated: false,
      });
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
      syncToRedis(ip, data);
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
  syncToRedis(ip, d);
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
