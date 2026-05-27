import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "wouter";
import yaml from "js-yaml";

const NEON = "#00ff9c";
const NEON_DIM = "#00b572";
const PINK = "#ff2bd6";
const BG = "#05070a";
const PANEL = "#0a0f14";
const PANEL_HI = "#0f1620";
const BORDER = "#11331f";
const MUTED = "#6b7a85";
const WARN = "#ffb020";
const RED = "#ff3b6b";

const MONO = `"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace`;

type ToolId =
  | "jwt" | "base64" | "json-yaml" | "hash" | "uuid" | "timestamp"
  | "regex" | "http" | "connstr" | "cron" | "color" | "curl"
  | "json-fmt" | "diff" | "lorem" | "markdown" | "url-parse" | "case"
  | "az-resid" | "aad-token" | "kql" | "arm-lint"
  | "az-sas" | "iac-transmute" | "cli-synth" | "irm-sp"
  | "kql-ai" | "arm-ai" | "cli-ai" | "err-ai";

type Category = { name: string; tools: { id: ToolId; label: string; icon: string; desc: string }[] };

const CATEGORIES: Category[] = [
  {
    name: "// AZURE.IDENTITY",
    tools: [
      { id: "aad-token", label: "entra.token", icon: "▲", desc: "AAD/Entra JWT claim demultiplexer" },
      { id: "irm-sp", label: "irm.principal", icon: "◈", desc: "Service principal forge + RBAC binder" },
      { id: "az-sas", label: "az.sas.codec", icon: "⊕", desc: "Storage SAS HMAC-SHA256 codec" },
    ],
  },
  {
    name: "// AZURE.IAC",
    tools: [
      { id: "az-resid", label: "az.resourceId", icon: "☁", desc: "ARM resource URI deconstructor" },
      { id: "arm-lint", label: "arm.lint", icon: "✦", desc: "ARM/Bicep policy compliance scanner" },
      { id: "iac-transmute", label: "iac.transmute", icon: "⇄", desc: "ARM ↔ Bicep declarative transmutation" },
      { id: "arm-ai", label: "arm.sentinel", icon: "★", desc: "AI-augmented IaC security audit" },
    ],
  },
  {
    name: "// AZURE.OBSERVABILITY",
    tools: [
      { id: "kql", label: "kql.playground", icon: "λ", desc: "Kusto telemetry query corpus (30+)" },
      { id: "kql-ai", label: "kql.cogniscan", icon: "✧", desc: "AI Kusto explainer + optimizer" },
      { id: "err-ai", label: "error.decryptor", icon: "⚠", desc: "AI Azure fault root-cause engine" },
    ],
  },
  {
    name: "// AZURE.CONTROL_PLANE",
    tools: [
      { id: "cli-synth", label: "cli.synthesizer", icon: "▷", desc: "az command lattice generator" },
      { id: "cli-ai", label: "cli.exegete", icon: "✺", desc: "AI az command flag exegesis" },
    ],
  },
  {
    name: "// AUTH & TOKENS",
    tools: [
      { id: "jwt", label: "JWT.decode", icon: "◆", desc: "Decode + inspect JSON Web Tokens" },
      { id: "hash", label: "hash.compute", icon: "#", desc: "MD5 / SHA-1/256/384/512" },
      { id: "uuid", label: "uuid.gen", icon: "⬡", desc: "UUID v4 / v7 generator" },
    ],
  },
  {
    name: "// FORMAT & CONVERT",
    tools: [
      { id: "base64", label: "base64.codec", icon: "≡", desc: "Base64 / URL / Hex encode" },
      { id: "json-yaml", label: "json⇄yaml", icon: "⇌", desc: "JSON / YAML / TOML convert" },
      { id: "json-fmt", label: "json.format", icon: "{}", desc: "Format + validate JSON" },
      { id: "case", label: "case.convert", icon: "Aa", desc: "camel / snake / kebab / pascal" },
    ],
  },
  {
    name: "// PARSE & INSPECT",
    tools: [
      { id: "regex", label: "regex.test", icon: "*", desc: "Live regex matching + groups" },
      { id: "connstr", label: "connstr.parse", icon: "⛓", desc: "Postgres / Mongo / Azure" },
      { id: "url-parse", label: "url.parse", icon: "→", desc: "Break URL into parts" },
      { id: "curl", label: "curl→code", icon: "↻", desc: "cURL → fetch / axios / py" },
    ],
  },
  {
    name: "// TIME & SCHEDULE",
    tools: [
      { id: "timestamp", label: "epoch.convert", icon: "⌚", desc: "Epoch ↔ ISO ↔ Azure log" },
      { id: "cron", label: "cron.parse", icon: "⏱", desc: "Cron expression + next runs" },
    ],
  },
  {
    name: "// NETWORK",
    tools: [
      { id: "http", label: "http.request", icon: "⌖", desc: "Mini Postman / curl runner" },
    ],
  },
  {
    name: "// CONTENT",
    tools: [
      { id: "color", label: "color.contrast", icon: "◐", desc: "WCAG AA/AAA checker" },
      { id: "diff", label: "text.diff", icon: "Δ", desc: "Side-by-side line diff" },
      { id: "markdown", label: "md.preview", icon: "M↓", desc: "Markdown live preview" },
      { id: "lorem", label: "lorem.gen", icon: "¶", desc: "Lorem ipsum generator" },
    ],
  },
];

const ALL_TOOLS = CATEGORIES.flatMap(c => c.tools);

// ───────────── helpers ─────────────
function copy(text: string, toast: (s: string) => void) {
  navigator.clipboard.writeText(text).then(() => toast(`copied ${text.length}b`)).catch(() => toast("copy failed"));
}

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  try { return decodeURIComponent(escape(atob(s))); } catch { return atob(s); }
}

async function digest(algo: "MD5"|"SHA-1"|"SHA-256"|"SHA-384"|"SHA-512", txt: string): Promise<string> {
  if (algo === "MD5") return md5(txt);
  const buf = new TextEncoder().encode(txt);
  const h = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// tiny MD5 (public domain, blueimp) — for completeness, dev tooling only
function md5(str: string): string {
  function rh(n:number){let j,s="";for(j=0;j<=3;j++)s+=("0"+((n>>(j*8+4))&15).toString(16)).slice(-1)+("0"+((n>>(j*8))&15).toString(16)).slice(-1);return s;}
  function ad(x:number,y:number){const l=(x&0xFFFF)+(y&0xFFFF);return(((x>>16)+(y>>16)+(l>>16))<<16)|(l&0xFFFF);}
  function rl(n:number,c:number){return(n<<c)|(n>>>(32-c));}
  function cm(q:number,a:number,b:number,x:number,s:number,t:number){return ad(rl(ad(ad(a,q),ad(x,t)),s),b);}
  function ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cm((b&c)|((~b)&d),a,b,x,s,t);}
  function gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cm((b&d)|(c&(~d)),a,b,x,s,t);}
  function hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cm(b^c^d,a,b,x,s,t);}
  function ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cm(c^(b|(~d)),a,b,x,s,t);}
  function cb(s:string){const n=s.length,b:number[]=[];for(let i=0;i<n*8;i+=8)b[i>>5]|=(s.charCodeAt(i/8)&0xFF)<<(i%32);return b;}
  const x=cb(unescape(encodeURIComponent(str))); x[str.length*8>>5]|=0x80<<((str.length*8)%32); x[(((str.length*8+64)>>>9)<<4)+14]=str.length*8;
  let a=1732584193,b=-271733879,c=-1732584194,d=271733878;
  for(let i=0;i<x.length;i+=16){const oa=a,ob=b,oc=c,od=d;
    a=ff(a,b,c,d,x[i],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);
    a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);
    a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
    a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);
    a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i],20,-373897302);
    a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);
    a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);
    a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);
    a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);
    a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);
    a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);
    a=hh(a,b,c,d,x[i+9],4,-640364487);d=hh(d,a,b,c,x[i+12],11,-421815835);c=hh(c,d,a,b,x[i+15],16,530742520);b=hh(b,c,d,a,x[i+2],23,-995338651);
    a=ii(a,b,c,d,x[i],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);
    a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);
    a=ii(a,b,c,d,x[i+8],6,1873313359);d=ii(d,a,b,c,x[i+15],10,-30611744);c=ii(c,d,a,b,x[i+6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21,1309151649);
    a=ii(a,b,c,d,x[i+4],6,-145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+2],15,718787259);b=ii(b,c,d,a,x[i+9],21,-343485551);
    a=ad(a,oa);b=ad(b,ob);c=ad(c,oc);d=ad(d,od);
  }
  return rh(a)+rh(b)+rh(c)+rh(d);
}

// ───────────── UI primitives ─────────────
const cardStyle: React.CSSProperties = {
  background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 4,
  boxShadow: `0 0 18px ${NEON}11, inset 0 0 0 1px ${PANEL_HI}`,
};

function Btn({ children, onClick, kind = "ghost", title }: any) {
  const isPrimary = kind === "primary";
  return (
    <button onClick={onClick} title={title}
      className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-all"
      style={{
        fontFamily: MONO,
        background: isPrimary ? `${NEON}18` : "transparent",
        border: `1px solid ${isPrimary ? NEON : BORDER}`,
        color: isPrimary ? NEON : NEON_DIM,
        boxShadow: isPrimary ? `0 0 12px ${NEON}55` : "none",
        cursor: "pointer", borderRadius: 2,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = NEON; (e.currentTarget as HTMLElement).style.color = NEON; }}
      onMouseLeave={e => { if (!isPrimary) { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.color = NEON_DIM; } }}
    >{children}</button>
  );
}

function Pane({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}`, fontFamily: MONO }}>
        <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: NEON_DIM }}>// {title}</div>
        <div className="flex gap-1.5">{actions}</div>
      </div>
      <div className="p-3 flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}

function TA({ value, onChange, placeholder, rows = 8, mono = true, readOnly = false }: any) {
  return (
    <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} rows={rows} readOnly={readOnly} spellCheck={false}
      className="w-full px-3 py-2 text-sm resize-y outline-none"
      style={{
        background: "#000a05", border: `1px solid ${BORDER}`, color: NEON,
        fontFamily: mono ? MONO : undefined, borderRadius: 2,
        caretColor: NEON, boxShadow: `inset 0 0 12px ${NEON}11`,
      }}
    />
  );
}

function In({ value, onChange, placeholder, type = "text" }: any) {
  return (
    <input value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} type={type} spellCheck={false}
      className="w-full px-3 py-2 text-sm outline-none"
      style={{
        background: "#000a05", border: `1px solid ${BORDER}`, color: NEON,
        fontFamily: MONO, borderRadius: 2,
        caretColor: NEON,
      }}
    />
  );
}

function Label({ children }: any) {
  return <div className="text-[10px] uppercase tracking-[0.24em] mb-1.5" style={{ color: MUTED, fontFamily: MONO }}>{children}</div>;
}

// ───────────── tools ─────────────

function JwtTool({ toast }: { toast: (s: string) => void }) {
  const [tok, setTok] = useState("");
  const decoded = useMemo(() => {
    if (!tok.trim()) return null;
    const parts = tok.trim().split(".");
    if (parts.length !== 3) return { error: "Invalid JWT — expected 3 segments (header.payload.signature)" };
    try {
      const header = JSON.parse(b64urlDecode(parts[0]));
      const payload = JSON.parse(b64urlDecode(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      const expired = payload.exp ? payload.exp < now : null;
      const expiresIn = payload.exp ? payload.exp - now : null;
      return { header, payload, signature: parts[2], expired, expiresIn };
    } catch (e: any) { return { error: e.message }; }
  }, [tok]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
      <Pane title="ENCODED TOKEN" actions={<Btn onClick={() => copy(tok, toast)}>COPY</Btn>}>
        <TA value={tok} onChange={setTok} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." rows={14} />
        <div className="mt-2 text-[10px]" style={{ color: MUTED, fontFamily: MONO }}>// {tok.length} chars · 3 segments expected</div>
      </Pane>
      <Pane title="DECODED" actions={decoded && !("error" in decoded) ? <Btn onClick={() => copy(JSON.stringify(decoded.payload, null, 2), toast)}>COPY PAYLOAD</Btn> : null}>
        {!decoded && <div style={{ color: MUTED, fontFamily: MONO }} className="text-xs">// awaiting token...</div>}
        {decoded && "error" in decoded && <div style={{ color: RED, fontFamily: MONO }} className="text-xs">⨯ {decoded.error}</div>}
        {decoded && !("error" in decoded) && (
          <div className="space-y-3 text-xs" style={{ fontFamily: MONO }}>
            <div>
              <div className="mb-1" style={{ color: PINK }}>HEADER</div>
              <pre style={{ color: NEON, background: "#000a05", padding: 8, border: `1px solid ${BORDER}`, whiteSpace: "pre-wrap" }}>{JSON.stringify(decoded.header, null, 2)}</pre>
            </div>
            <div>
              <div className="mb-1" style={{ color: PINK }}>PAYLOAD</div>
              <pre style={{ color: NEON, background: "#000a05", padding: 8, border: `1px solid ${BORDER}`, whiteSpace: "pre-wrap" }}>{JSON.stringify(decoded.payload, null, 2)}</pre>
            </div>
            <div>
              <div className="mb-1" style={{ color: PINK }}>SIGNATURE</div>
              <pre style={{ color: NEON_DIM, background: "#000a05", padding: 8, border: `1px solid ${BORDER}`, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{decoded.signature}</pre>
            </div>
            {decoded.expiresIn !== null && (
              <div style={{ color: decoded.expired ? RED : NEON, padding: 8, border: `1px solid ${decoded.expired ? RED : NEON}`, background: decoded.expired ? `${RED}11` : `${NEON}11` }}>
                {decoded.expired ? `⨯ EXPIRED ${Math.abs(decoded.expiresIn!)}s ago` : `✓ VALID · expires in ${decoded.expiresIn}s (${Math.round(decoded.expiresIn!/60)}m)`}
              </div>
            )}
          </div>
        )}
      </Pane>
    </div>
  );
}

function Base64Tool({ toast }: { toast: (s: string) => void }) {
  const [mode, setMode] = useState<"b64"|"url"|"hex">("b64");
  const [input, setInput] = useState("");
  const [dir, setDir] = useState<"enc"|"dec">("enc");
  const output = useMemo(() => {
    try {
      if (mode === "b64") return dir === "enc" ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input)));
      if (mode === "url") return dir === "enc" ? encodeURIComponent(input) : decodeURIComponent(input);
      if (mode === "hex") {
        if (dir === "enc") return Array.from(new TextEncoder().encode(input)).map(b => b.toString(16).padStart(2, "0")).join("");
        const m = input.replace(/\s+/g, "").match(/.{1,2}/g) || [];
        return new TextDecoder().decode(new Uint8Array(m.map(h => parseInt(h, 16))));
      }
    } catch (e: any) { return `⨯ ${e.message}`; }
    return "";
  }, [input, mode, dir]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex gap-2 flex-wrap">
        {(["b64","url","hex"] as const).map(m => (
          <Btn key={m} kind={mode===m?"primary":"ghost"} onClick={() => setMode(m)}>{m==="b64"?"BASE64":m==="url"?"URL":"HEX"}</Btn>
        ))}
        <div className="w-px" style={{ background: BORDER, margin: "0 4px" }} />
        <Btn kind={dir==="enc"?"primary":"ghost"} onClick={() => setDir("enc")}>ENCODE →</Btn>
        <Btn kind={dir==="dec"?"primary":"ghost"} onClick={() => setDir("dec")}>← DECODE</Btn>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <Pane title="INPUT"><TA value={input} onChange={setInput} placeholder="enter text..." rows={16} /></Pane>
        <Pane title="OUTPUT" actions={<Btn onClick={() => copy(output, toast)}>COPY</Btn>}><TA value={output} readOnly rows={16} /></Pane>
      </div>
    </div>
  );
}

function JsonYamlTool({ toast }: { toast: (s: string) => void }) {
  const [input, setInput] = useState('{\n  "name": "Turbo",\n  "tier": "enterprise",\n  "features": ["chat", "code", "terminal"]\n}');
  const [from, setFrom] = useState<"json"|"yaml">("json");
  const [to, setTo] = useState<"json"|"yaml">("yaml");
  const output = useMemo(() => {
    try {
      const data = from === "json" ? JSON.parse(input) : yaml.load(input);
      if (to === "json") return JSON.stringify(data, null, 2);
      return yaml.dump(data, { indent: 2, lineWidth: 120 });
    } catch (e: any) { return `# ⨯ parse error: ${e.message}`; }
  }, [input, from, to]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex gap-2 flex-wrap items-center">
        <Label>FROM</Label>
        <Btn kind={from==="json"?"primary":"ghost"} onClick={() => setFrom("json")}>JSON</Btn>
        <Btn kind={from==="yaml"?"primary":"ghost"} onClick={() => setFrom("yaml")}>YAML</Btn>
        <Label>→ TO</Label>
        <Btn kind={to==="json"?"primary":"ghost"} onClick={() => setTo("json")}>JSON</Btn>
        <Btn kind={to==="yaml"?"primary":"ghost"} onClick={() => setTo("yaml")}>YAML</Btn>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <Pane title={`SOURCE [${from.toUpperCase()}]`}><TA value={input} onChange={setInput} rows={20} /></Pane>
        <Pane title={`OUTPUT [${to.toUpperCase()}]`} actions={<Btn onClick={() => copy(output, toast)}>COPY</Btn>}><TA value={output} readOnly rows={20} /></Pane>
      </div>
    </div>
  );
}

function JsonFmtTool({ toast }: { toast: (s: string) => void }) {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState(2);
  const result = useMemo(() => {
    if (!input.trim()) return { ok: true, out: "" };
    try { return { ok: true, out: JSON.stringify(JSON.parse(input), null, indent) }; }
    catch (e: any) { return { ok: false, out: e.message }; }
  }, [input, indent]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex gap-2 flex-wrap items-center">
        <Label>INDENT</Label>
        {[0,2,4].map(i => <Btn key={i} kind={indent===i?"primary":"ghost"} onClick={() => setIndent(i)}>{i===0?"MINIFY":i}</Btn>)}
        <div style={{ color: result.ok?NEON:RED, fontFamily: MONO }} className="ml-auto text-[10px] uppercase tracking-[0.2em]">
          {result.ok ? "✓ VALID" : "⨯ INVALID"}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <Pane title="INPUT"><TA value={input} onChange={setInput} placeholder='{"key": "value"}' rows={20} /></Pane>
        <Pane title="FORMATTED" actions={<Btn onClick={() => copy(result.out, toast)}>COPY</Btn>}>
          <TA value={result.out} readOnly rows={20} />
        </Pane>
      </div>
    </div>
  );
}

function HashTool({ toast }: { toast: (s: string) => void }) {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Record<string,string>>({});
  useEffect(() => {
    (async () => {
      if (!input) { setHashes({}); return; }
      const algos: ("MD5"|"SHA-1"|"SHA-256"|"SHA-384"|"SHA-512")[] = ["MD5","SHA-1","SHA-256","SHA-384","SHA-512"];
      const out: Record<string,string> = {};
      for (const a of algos) out[a] = await digest(a, input);
      setHashes(out);
    })();
  }, [input]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="INPUT"><TA value={input} onChange={setInput} placeholder="enter text to hash..." rows={5} /></Pane>
      <div className="grid grid-cols-1 gap-2 flex-1 min-h-0 overflow-auto">
        {Object.entries(hashes).map(([algo, h]) => (
          <div key={algo} style={cardStyle} className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: PINK, fontFamily: MONO }}>{algo}</div>
              <Btn onClick={() => copy(h, toast)}>COPY</Btn>
            </div>
            <div className="text-xs break-all" style={{ color: NEON, fontFamily: MONO }}>{h || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UuidTool({ toast }: { toast: (s: string) => void }) {
  const [count, setCount] = useState(8);
  const [version, setVersion] = useState<"v4"|"v7">("v4");
  const [ids, setIds] = useState<string[]>([]);
  const gen = useCallback(() => {
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      if (version === "v4") {
        out.push(crypto.randomUUID());
      } else {
        const ts = Date.now();
        const rand = crypto.getRandomValues(new Uint8Array(10));
        const tsHex = ts.toString(16).padStart(12, "0");
        rand[0] = (rand[0] & 0x0f) | 0x70;
        rand[2] = (rand[2] & 0x3f) | 0x80;
        const r = Array.from(rand).map(b => b.toString(16).padStart(2,"0")).join("");
        out.push(`${tsHex.slice(0,8)}-${tsHex.slice(8,12)}-${r.slice(0,4)}-${r.slice(4,8)}-${r.slice(8,20)}`);
      }
    }
    setIds(out);
  }, [count, version]);
  useEffect(() => { gen(); }, [gen]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex gap-2 flex-wrap items-center">
        <Label>VERSION</Label>
        <Btn kind={version==="v4"?"primary":"ghost"} onClick={() => setVersion("v4")}>V4 RANDOM</Btn>
        <Btn kind={version==="v7"?"primary":"ghost"} onClick={() => setVersion("v7")}>V7 TIME-ORDERED</Btn>
        <Label>COUNT</Label>
        <div style={{ width: 80 }}><In value={String(count)} onChange={(v: string) => setCount(Math.max(1, Math.min(500, parseInt(v)||1)))} type="number" /></div>
        <Btn kind="primary" onClick={gen}>↻ REGENERATE</Btn>
        <Btn onClick={() => copy(ids.join("\n"), toast)}>COPY ALL</Btn>
      </div>
      <Pane title={`${ids.length} GENERATED`}>
        <div className="space-y-1 text-xs" style={{ fontFamily: MONO }}>
          {ids.map((id, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 cursor-pointer" style={{ background: i%2 ? `${PANEL_HI}` : "transparent", color: NEON }} onClick={() => copy(id, toast)}>
              <span style={{ color: MUTED, width: 28 }}>{String(i+1).padStart(3,"0")}</span>
              <span className="flex-1">{id}</span>
            </div>
          ))}
        </div>
      </Pane>
    </div>
  );
}

function TimestampTool({ toast }: { toast: (s: string) => void }) {
  const [val, setVal] = useState(String(Math.floor(Date.now()/1000)));
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const parsed = useMemo(() => {
    const n = Number(val);
    let d: Date | null = null;
    if (!isNaN(n) && val.trim()) d = new Date(val.length <= 10 ? n*1000 : n);
    else if (val.trim()) { const t = new Date(val); if (!isNaN(t.getTime())) d = t; }
    if (!d || isNaN(d.getTime())) return null;
    return d;
  }, [val]);
  const row = (label: string, v: string) => (
    <div className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-white/5 px-2" onClick={() => copy(v, toast)}>
      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: MUTED, fontFamily: MONO, width: 130 }}>{label}</div>
      <div className="text-xs flex-1" style={{ color: NEON, fontFamily: MONO }}>{v}</div>
    </div>
  );
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="INPUT (epoch sec/ms or ISO/RFC date)" actions={<Btn onClick={() => setVal(String(Math.floor(Date.now()/1000)))}>↻ NOW</Btn>}>
        <In value={val} onChange={setVal} placeholder="1716800000 or 2026-05-27T12:00:00Z" />
        <div className="mt-2 text-[10px]" style={{ color: MUTED, fontFamily: MONO }}>// live clock: {new Date(now).toISOString()}</div>
      </Pane>
      {parsed && (
        <Pane title="PARSED">
          <div>
            {row("EPOCH (s)", String(Math.floor(parsed.getTime()/1000)))}
            {row("EPOCH (ms)", String(parsed.getTime()))}
            {row("ISO 8601", parsed.toISOString())}
            {row("RFC 2822", parsed.toUTCString())}
            {row("UTC", parsed.toUTCString())}
            {row("LOCAL", parsed.toString())}
            {row("AZURE LOG", parsed.toISOString().replace("T"," ").replace("Z"," UTC"))}
            {row("REL TO NOW", `${Math.round((now-parsed.getTime())/1000)}s ago`)}
          </div>
        </Pane>
      )}
    </div>
  );
}

function RegexTool({ toast }: { toast: (s: string) => void }) {
  const [pattern, setPattern] = useState("\\b(\\w+)@(\\w+\\.\\w+)\\b");
  const [flags, setFlags] = useState("gi");
  const [text, setText] = useState("contact tiago@matrix.ai or admin@turbo.dev for help");
  const result = useMemo(() => {
    // Guards against catastrophic backtracking freezing the UI thread.
    if (pattern.length > 500) return { ok: false, error: "pattern too long (max 500 chars — try shorter)" } as any;
    if (text.length > 50000) return { ok: false, error: "input too long (max 50KB — paste a smaller sample)" } as any;
    // Heuristic: reject obviously dangerous nested-quantifier patterns
    if (/(\([^)]*[+*][^)]*\)[+*])|(\[[^\]]*\][+*]){2,}/.test(pattern)) {
      return { ok: false, error: "pattern looks unsafe (nested quantifiers can hang the page)" } as any;
    }
    try {
      const re = new RegExp(pattern, flags);
      const matches: { match: string; groups: string[]; index: number }[] = [];
      const MAX_MATCHES = 1000;
      if (flags.includes("g")) {
        let m;
        while ((m = re.exec(text)) !== null && matches.length < MAX_MATCHES) {
          matches.push({ match: m[0], groups: m.slice(1), index: m.index });
          if (m.index === re.lastIndex) re.lastIndex++;
        }
      } else {
        const m = re.exec(text);
        if (m) matches.push({ match: m[0], groups: m.slice(1), index: m.index });
      }
      return { ok: true, matches };
    } catch (e: any) { return { ok: false, error: e.message } as any; }
  }, [pattern, flags, text]);
  const highlighted = useMemo(() => {
    if (!result.ok || !result.matches.length) return text;
    let out = ""; let last = 0;
    for (const m of result.matches) {
      out += text.slice(last, m.index);
      out += `\u0001${m.match}\u0002`;
      last = m.index + m.match.length;
    }
    out += text.slice(last);
    return out;
  }, [text, result]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_140px] gap-3">
        <Pane title="PATTERN"><In value={pattern} onChange={setPattern} /></Pane>
        <Pane title="FLAGS"><In value={flags} onChange={setFlags} placeholder="gim" /></Pane>
      </div>
      <Pane title="TEST STRING"><TA value={text} onChange={setText} rows={6} /></Pane>
      <Pane title={result.ok ? `${result.matches?.length || 0} MATCHES` : "⨯ INVALID REGEX"}>
        {!result.ok && <div style={{ color: RED, fontFamily: MONO }} className="text-xs">{(result as any).error}</div>}
        {result.ok && (
          <>
            <div className="text-xs mb-3 whitespace-pre-wrap" style={{ fontFamily: MONO, color: NEON_DIM }}>
              {highlighted.split("\u0001").map((chunk, i) => {
                if (i === 0) return <span key={i}>{chunk}</span>;
                const [hit, rest] = chunk.split("\u0002");
                return <span key={i}><span style={{ background: `${NEON}33`, color: NEON, padding: "0 2px", boxShadow: `0 0 6px ${NEON}66` }}>{hit}</span>{rest}</span>;
              })}
            </div>
            <div className="space-y-1 text-xs" style={{ fontFamily: MONO }}>
              {result.matches.map((m: any, i: number) => (
                <div key={i} className="flex gap-3 px-2 py-1" style={{ background: i%2?PANEL_HI:"transparent" }}>
                  <span style={{ color: MUTED, width: 50 }}>#{i+1}@{m.index}</span>
                  <span style={{ color: NEON, flex: 1 }}>{m.match}</span>
                  {m.groups.length > 0 && <span style={{ color: PINK }}>[{m.groups.join(", ")}]</span>}
                  <Btn onClick={() => copy(m.match, toast)}>COPY</Btn>
                </div>
              ))}
            </div>
          </>
        )}
      </Pane>
    </div>
  );
}

function HttpTool({ toast }: { toast: (s: string) => void }) {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.github.com/zen");
  const [headers, setHeaders] = useState('{\n  "Accept": "application/json"\n}');
  const [body, setBody] = useState("");
  const [resp, setResp] = useState<{ status?: number; time?: number; headers?: any; body?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true); setResp(null);
    const t0 = performance.now();
    try {
      const h = headers.trim() ? JSON.parse(headers) : undefined;
      const r = await fetch(url, { method, headers: h, body: ["GET","HEAD"].includes(method) ? undefined : body });
      const text = await r.text();
      const rh: Record<string,string> = {};
      r.headers.forEach((v, k) => { rh[k] = v; });
      setResp({ status: r.status, time: Math.round(performance.now()-t0), headers: rh, body: text });
    } catch (e: any) { setResp({ error: e.message, time: Math.round(performance.now()-t0) }); }
    setLoading(false);
  };

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex gap-2 items-center">
        <div style={{ width: 110 }}>
          <select value={method} onChange={e => setMethod(e.target.value)} className="w-full px-2 py-2 text-xs outline-none"
            style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO, borderRadius: 2 }}>
            {["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1"><In value={url} onChange={setUrl} placeholder="https://..." /></div>
        <Btn kind="primary" onClick={send}>{loading ? "..." : "↪ SEND"}</Btn>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="space-y-3 flex flex-col min-h-0">
          <Pane title="HEADERS (JSON)"><TA value={headers} onChange={setHeaders} rows={6} /></Pane>
          <Pane title="BODY"><TA value={body} onChange={setBody} rows={8} placeholder='{"key": "value"}' /></Pane>
        </div>
        <Pane title={resp ? `RESPONSE · ${resp.status ?? "ERR"} · ${resp.time}ms` : "RESPONSE"} actions={resp?.body ? <Btn onClick={() => copy(resp.body!, toast)}>COPY</Btn> : null}>
          {!resp && <div className="text-xs" style={{ color: MUTED, fontFamily: MONO }}>// awaiting request...</div>}
          {resp?.error && <div className="text-xs" style={{ color: RED, fontFamily: MONO }}>⨯ {resp.error}</div>}
          {resp?.body !== undefined && (
            <div className="space-y-3">
              <div>
                <Label>STATUS</Label>
                <div className="text-sm" style={{ color: resp.status && resp.status < 400 ? NEON : RED, fontFamily: MONO }}>
                  {resp.status} · {resp.time}ms · {resp.body.length}b
                </div>
              </div>
              <div>
                <Label>HEADERS</Label>
                <pre className="text-[11px] p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON_DIM, fontFamily: MONO, whiteSpace: "pre-wrap" }}>{JSON.stringify(resp.headers, null, 2)}</pre>
              </div>
              <div>
                <Label>BODY</Label>
                <pre className="text-[11px] p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>{resp.body}</pre>
              </div>
            </div>
          )}
        </Pane>
      </div>
    </div>
  );
}

function ConnStrTool({ toast }: { toast: (s: string) => void }) {
  const [input, setInput] = useState("postgres://admin:s3cret@db.neon.tech:5432/turbo?sslmode=require");
  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    try {
      // Azure Storage / Service Bus style: Key=Value;Key=Value
      if (input.includes("=") && input.includes(";") && !input.includes("://")) {
        const out: Record<string,string> = {};
        input.split(";").filter(Boolean).forEach(p => { const i = p.indexOf("="); if (i>0) out[p.slice(0,i).trim()] = p.slice(i+1).trim(); });
        return { kind: "kvp", parts: out };
      }
      const u = new URL(input);
      const params: Record<string,string> = {};
      u.searchParams.forEach((v,k) => params[k] = v);
      return {
        kind: "url",
        parts: {
          protocol: u.protocol.replace(":",""),
          username: u.username,
          password: u.password ? "•".repeat(u.password.length) : "",
          host: u.hostname,
          port: u.port || "(default)",
          database: u.pathname.replace(/^\//,"") || "(none)",
          params: JSON.stringify(params, null, 2),
        },
      };
    } catch (e: any) { return { error: e.message } as any; }
  }, [input]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="CONNECTION STRING"><TA value={input} onChange={setInput} rows={4} placeholder="postgres://... · mongodb://... · DefaultEndpointsProtocol=https;AccountName=..." /></Pane>
      <Pane title={parsed?.error ? "⨯ PARSE ERROR" : "PARSED"}>
        {parsed?.error && <div className="text-xs" style={{ color: RED, fontFamily: MONO }}>{parsed.error}</div>}
        {parsed && !parsed.error && (
          <div className="text-xs" style={{ fontFamily: MONO }}>
            {Object.entries(parsed.parts).map(([k,v]) => (
              <div key={k} className="flex gap-3 py-1.5 px-2 cursor-pointer hover:bg-white/5" onClick={() => copy(String(v), toast)}>
                <div style={{ color: PINK, width: 110 }}>{k.toUpperCase()}</div>
                <div style={{ color: NEON, flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{String(v)}</div>
              </div>
            ))}
          </div>
        )}
      </Pane>
    </div>
  );
}

function UrlParseTool({ toast }: { toast: (s: string) => void }) {
  const [input, setInput] = useState("https://turbo.matrix-ai.com/api/v2/users?limit=10&sort=desc#section");
  const parsed = useMemo(() => {
    try {
      const u = new URL(input);
      const p: Record<string,string> = {};
      u.searchParams.forEach((v,k) => p[k] = v);
      return {
        protocol: u.protocol, host: u.host, hostname: u.hostname, port: u.port || "(default)",
        pathname: u.pathname, search: u.search, hash: u.hash, origin: u.origin,
        params: JSON.stringify(p, null, 2),
      };
    } catch (e: any) { return { error: e.message } as any; }
  }, [input]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="URL"><TA value={input} onChange={setInput} rows={3} /></Pane>
      <Pane title={parsed.error ? "⨯ INVALID URL" : "PARSED"}>
        {parsed.error && <div className="text-xs" style={{ color: RED, fontFamily: MONO }}>{parsed.error}</div>}
        {!parsed.error && (
          <div className="text-xs" style={{ fontFamily: MONO }}>
            {Object.entries(parsed).map(([k,v]) => (
              <div key={k} className="flex gap-3 py-1.5 px-2 cursor-pointer hover:bg-white/5" onClick={() => copy(String(v), toast)}>
                <div style={{ color: PINK, width: 110 }}>{k.toUpperCase()}</div>
                <div style={{ color: NEON, flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{String(v)}</div>
              </div>
            ))}
          </div>
        )}
      </Pane>
    </div>
  );
}

function CronTool() {
  const [expr, setExpr] = useState("*/15 * * * *");
  const result = useMemo(() => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return { error: "Cron must have 5 fields: minute hour day month weekday" };
    const labels = ["minute (0-59)", "hour (0-23)", "day (1-31)", "month (1-12)", "weekday (0-6, 0=Sun)"];
    return {
      parts: parts.map((p, i) => ({ value: p, label: labels[i] })),
      human: humanCron(parts),
      next: computeNext(parts, 8),
    };
  }, [expr]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="CRON EXPRESSION"><In value={expr} onChange={setExpr} placeholder="*/15 * * * *" /></Pane>
      {result.error && <Pane title="⨯ ERROR"><div className="text-xs" style={{ color: RED, fontFamily: MONO }}>{result.error}</div></Pane>}
      {!result.error && (
        <>
          <Pane title="BREAKDOWN">
            <div className="grid grid-cols-5 gap-2 text-xs" style={{ fontFamily: MONO }}>
              {result.parts!.map((p, i) => (
                <div key={i} style={cardStyle} className="p-2 text-center">
                  <div style={{ color: NEON, fontSize: 18 }}>{p.value}</div>
                  <div style={{ color: MUTED, fontSize: 9, marginTop: 4 }}>{p.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs" style={{ color: PINK, fontFamily: MONO }}>// {result.human}</div>
          </Pane>
          <Pane title="NEXT 8 RUNS (UTC)">
            <div className="space-y-1 text-xs" style={{ fontFamily: MONO }}>
              {result.next!.map((d, i) => (
                <div key={i} className="flex gap-3 px-2 py-1" style={{ background: i%2?PANEL_HI:"transparent", color: NEON }}>
                  <span style={{ color: MUTED, width: 30 }}>#{i+1}</span>
                  <span>{d.toISOString().replace("T"," ").replace(".000Z"," UTC")}</span>
                </div>
              ))}
            </div>
          </Pane>
        </>
      )}
    </div>
  );
}

function humanCron(p: string[]): string {
  const [m,h,d,mo,w] = p;
  if (m === "*" && h === "*" && d === "*" && mo === "*" && w === "*") return "every minute";
  if (m.startsWith("*/") && h === "*") return `every ${m.slice(2)} minutes`;
  if (m === "0" && h.startsWith("*/")) return `every ${h.slice(2)} hours on the hour`;
  if (m === "0" && h === "0" && d === "*" && mo === "*" && w === "*") return "daily at midnight UTC";
  if (m === "0" && d === "*" && mo === "*" && w === "*") return `daily at ${h}:00 UTC`;
  return `runs on m=${m} h=${h} d=${d} mo=${mo} w=${w}`;
}

function computeNext(parts: string[], n: number): Date[] {
  // simple "tick forward minute by minute" approach — good for next-N preview
  const matches = parts.map((p, i) => {
    const range = [[0,59],[0,23],[1,31],[1,12],[0,6]][i];
    return parseField(p, range[0], range[1]);
  });
  const out: Date[] = [];
  const d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes()+1);
  let safety = 0;
  while (out.length < n && safety < 200000) {
    if (matches[0].has(d.getUTCMinutes()) && matches[1].has(d.getUTCHours()) &&
        matches[2].has(d.getUTCDate()) && matches[3].has(d.getUTCMonth()+1) &&
        matches[4].has(d.getUTCDay())) {
      out.push(new Date(d));
    }
    d.setMinutes(d.getMinutes()+1);
    safety++;
  }
  return out;
}

function parseField(f: string, min: number, max: number): Set<number> {
  const out = new Set<number>();
  for (const part of f.split(",")) {
    if (part === "*") { for (let i=min;i<=max;i++) out.add(i); continue; }
    if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2));
      if (!step || step <= 0 || !isFinite(step)) continue; // guard: */0 would infinite-loop
      for (let i=min;i<=max;i+=step) out.add(i);
      continue;
    }
    if (part.includes("-")) {
      const [a,b] = part.split("-").map(Number);
      if (isNaN(a) || isNaN(b) || a > b) continue;
      for (let i=a;i<=b && i<=max+1000;i++) out.add(i);
      continue;
    }
    const n = parseInt(part); if (!isNaN(n)) out.add(n);
  }
  return out;
}

function ColorTool({ toast }: { toast: (s: string) => void }) {
  const [fg, setFg] = useState("#00ff9c");
  const [bg, setBg] = useState("#05070a");
  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="grid grid-cols-2 gap-3">
        <Pane title="FOREGROUND">
          <div className="flex gap-2 items-center">
            <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="w-12 h-10 cursor-pointer" style={{ background: "transparent", border: `1px solid ${BORDER}` }} />
            <In value={fg} onChange={setFg} />
          </div>
        </Pane>
        <Pane title="BACKGROUND">
          <div className="flex gap-2 items-center">
            <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-12 h-10 cursor-pointer" style={{ background: "transparent", border: `1px solid ${BORDER}` }} />
            <In value={bg} onChange={setBg} />
          </div>
        </Pane>
      </div>
      <Pane title="PREVIEW">
        <div className="p-8 text-center" style={{ background: bg, color: fg, border: `1px solid ${BORDER}` }}>
          <div className="text-3xl font-bold mb-2">Aa Bb Cc 123</div>
          <div className="text-sm">The quick brown fox jumps over the lazy dog.</div>
        </div>
      </Pane>
      <Pane title="WCAG CONTRAST" actions={<Btn onClick={() => copy(ratio.toFixed(2), toast)}>COPY</Btn>}>
        <div className="text-center py-4">
          <div className="text-5xl font-bold" style={{ color: NEON, fontFamily: MONO }}>{ratio.toFixed(2)}:1</div>
          <div className="grid grid-cols-4 gap-2 mt-4 text-xs" style={{ fontFamily: MONO }}>
            {[["AA Normal", 4.5],["AA Large", 3],["AAA Normal", 7],["AAA Large", 4.5]].map(([l, t]: any) => (
              <div key={l} style={{ border: `1px solid ${ratio>=t?NEON:RED}`, color: ratio>=t?NEON:RED, padding: 8, background: `${ratio>=t?NEON:RED}11` }}>
                {ratio>=t ? "✓" : "⨯"} {l}<br/><span style={{ color: MUTED }}>≥ {t}:1</span>
              </div>
            ))}
          </div>
        </div>
      </Pane>
    </div>
  );
}

function contrastRatio(a: string, b: string): number {
  const la = lum(a), lb = lum(b);
  return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05);
}
function lum(hex: string): number {
  const c = hex.replace("#","");
  const r = parseInt(c.slice(0,2),16)/255, g = parseInt(c.slice(2,4),16)/255, b = parseInt(c.slice(4,6),16)/255;
  const f = (v: number) => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);
}

function CurlTool({ toast }: { toast: (s: string) => void }) {
  const [input, setInput] = useState("curl -X POST https://api.example.com/v1/widgets -H 'Authorization: Bearer abc123' -H 'Content-Type: application/json' -d '{\"name\":\"thing\"}'");
  const [target, setTarget] = useState<"fetch"|"axios"|"python"|"powershell">("fetch");
  const parsed = useMemo(() => parseCurl(input), [input]);
  const out = useMemo(() => genCode(parsed, target), [parsed, target]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="cURL COMMAND"><TA value={input} onChange={setInput} rows={5} /></Pane>
      <div className="flex gap-2 flex-wrap">
        {(["fetch","axios","python","powershell"] as const).map(t => (
          <Btn key={t} kind={target===t?"primary":"ghost"} onClick={() => setTarget(t)}>
            {t==="fetch"?"JS FETCH":t==="axios"?"AXIOS":t==="python"?"PYTHON":"POWERSHELL"}
          </Btn>
        ))}
      </div>
      <Pane title={`GENERATED [${target.toUpperCase()}]`} actions={<Btn onClick={() => copy(out, toast)}>COPY</Btn>}>
        <TA value={out} readOnly rows={14} />
      </Pane>
    </div>
  );
}

function parseCurl(s: string) {
  const r: { url: string; method: string; headers: Record<string,string>; body?: string } = { url: "", method: "GET", headers: {} };
  const toks = s.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g) || [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i].replace(/^['"]|['"]$/g, "");
    if (t === "curl") continue;
    if (t === "-X" || t === "--request") { r.method = toks[++i]?.replace(/^['"]|['"]$/g, "") || "GET"; continue; }
    if (t === "-H" || t === "--header") {
      const h = toks[++i]?.replace(/^['"]|['"]$/g, "") || "";
      const idx = h.indexOf(":"); if (idx>0) r.headers[h.slice(0,idx).trim()] = h.slice(idx+1).trim();
      continue;
    }
    if (t === "-d" || t === "--data" || t === "--data-raw") { r.body = toks[++i]?.replace(/^['"]|['"]$/g, ""); if (r.method==="GET") r.method="POST"; continue; }
    if (t.startsWith("http")) r.url = t;
  }
  return r;
}

function genCode(p: ReturnType<typeof parseCurl>, target: string): string {
  if (target === "fetch") {
    return `const res = await fetch("${p.url}", {\n  method: "${p.method}",\n  headers: ${JSON.stringify(p.headers, null, 2).replace(/\n/g, "\n  ")},${p.body?`\n  body: ${JSON.stringify(p.body)},`:""}\n});\nconst data = await res.json();\nconsole.log(data);`;
  }
  if (target === "axios") {
    return `import axios from "axios";\n\nconst { data } = await axios({\n  url: "${p.url}",\n  method: "${p.method}",\n  headers: ${JSON.stringify(p.headers, null, 2).replace(/\n/g, "\n  ")},${p.body?`\n  data: ${JSON.stringify(p.body)},`:""}\n});\nconsole.log(data);`;
  }
  if (target === "python") {
    return `import requests\n\nres = requests.request(\n    "${p.method}",\n    "${p.url}",\n    headers=${JSON.stringify(p.headers, null, 4).replace(/"/g, '"')},${p.body?`\n    data=${JSON.stringify(p.body)},`:""}\n)\nprint(res.json())`;
  }
  // powershell
  const hdrPS = Object.entries(p.headers).map(([k,v]) => `    "${k}" = "${v}"`).join("\n");
  return `$headers = @{\n${hdrPS}\n}\n\nInvoke-RestMethod -Uri "${p.url}" \`\n  -Method ${p.method} \`\n  -Headers $headers${p.body?` \`\n  -Body '${p.body.replace(/'/g,"''")}'`:""}`;
}

function CaseTool({ toast }: { toast: (s: string) => void }) {
  const [input, setInput] = useState("Hello World Example Text");
  const variants = useMemo(() => {
    const words = input.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().split(/\s+/).filter(Boolean);
    const lower = words.map(w => w.toLowerCase());
    return [
      ["camelCase", lower.map((w,i) => i===0 ? w : w[0].toUpperCase()+w.slice(1)).join("")],
      ["PascalCase", lower.map(w => w[0].toUpperCase()+w.slice(1)).join("")],
      ["snake_case", lower.join("_")],
      ["SCREAMING_SNAKE", lower.map(w=>w.toUpperCase()).join("_")],
      ["kebab-case", lower.join("-")],
      ["dot.case", lower.join(".")],
      ["path/case", lower.join("/")],
      ["Train-Case", lower.map(w=>w[0].toUpperCase()+w.slice(1)).join("-")],
      ["UPPER CASE", input.toUpperCase()],
      ["lower case", input.toLowerCase()],
      ["Title Case", input.replace(/\w\S*/g, t => t[0].toUpperCase()+t.slice(1).toLowerCase())],
      ["iNVERT cASE", input.split("").map(c => c===c.toUpperCase()?c.toLowerCase():c.toUpperCase()).join("")],
    ];
  }, [input]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="INPUT"><TA value={input} onChange={setInput} rows={3} /></Pane>
      <Pane title="VARIANTS">
        <div className="space-y-1 text-xs" style={{ fontFamily: MONO }}>
          {variants.map(([name, v], i) => (
            <div key={name} className="flex gap-3 px-2 py-1.5 cursor-pointer hover:bg-white/5" style={{ background: i%2?PANEL_HI:"transparent" }} onClick={() => copy(v, toast)}>
              <div style={{ color: PINK, width: 140 }}>{name}</div>
              <div style={{ color: NEON, flex: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </Pane>
    </div>
  );
}

function DiffTool() {
  const [a, setA] = useState("line one\nline two\nline three\nline four");
  const [b, setB] = useState("line one\nline TWO\nline three\nline 4\nline five");
  const diff = useMemo(() => lineDiff(a, b), [a, b]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="grid grid-cols-2 gap-3">
        <Pane title="ORIGINAL"><TA value={a} onChange={setA} rows={10} /></Pane>
        <Pane title="CHANGED"><TA value={b} onChange={setB} rows={10} /></Pane>
      </div>
      <Pane title={`DIFF · +${diff.filter(d=>d.t==="+").length} −${diff.filter(d=>d.t==="-").length}`}>
        <pre className="text-xs" style={{ fontFamily: MONO, whiteSpace: "pre-wrap" }}>
          {diff.map((d, i) => (
            <div key={i} style={{
              color: d.t==="+"?NEON:d.t==="-"?RED:NEON_DIM,
              background: d.t==="+"?`${NEON}11`:d.t==="-"?`${RED}11`:"transparent",
              padding: "1px 8px",
            }}>{d.t} {d.line}</div>
          ))}
        </pre>
      </Pane>
    </div>
  );
}

function lineDiff(a: string, b: string): { t: "+"|"-"|" "; line: string }[] {
  const la = a.split("\n"), lb = b.split("\n");
  const out: { t: "+"|"-"|" "; line: string }[] = [];
  let i=0,j=0;
  while (i < la.length || j < lb.length) {
    if (i<la.length && j<lb.length && la[i]===lb[j]) { out.push({ t:" ", line: la[i] }); i++; j++; }
    else if (j<lb.length && !la.slice(i).includes(lb[j])) { out.push({ t:"+", line: lb[j] }); j++; }
    else if (i<la.length && !lb.slice(j).includes(la[i])) { out.push({ t:"-", line: la[i] }); i++; }
    else if (i<la.length) { out.push({ t:"-", line: la[i] }); i++; }
    else { out.push({ t:"+", line: lb[j] }); j++; }
  }
  return out;
}

function MarkdownTool() {
  const [src, setSrc] = useState("# Turbo DevOps Toolkit\n\nWelcome to **the toolkit** every Azure engineer wishes they had.\n\n- JWT decoder\n- Hash generator\n- *Real* utility\n\n```js\nconsole.log('shipped');\n```\n\n> Built in one session, ~$5 of agent time.");
  const html = useMemo(() => mdToHtml(src), [src]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <Pane title="MARKDOWN"><TA value={src} onChange={setSrc} rows={22} /></Pane>
        <Pane title="PREVIEW">
          <div className="prose-sm max-w-none text-sm" style={{ color: NEON }} dangerouslySetInnerHTML={{ __html: html }} />
        </Pane>
      </div>
    </div>
  );
}

function mdToHtml(md: string): string {
  let h = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```([\s\S]*?)```/g, (_,c) => `<pre style="background:#000a05;border:1px solid ${BORDER};padding:8px;color:${NEON};overflow:auto"><code>${c}</code></pre>`)
    .replace(/`([^`]+)`/g, `<code style="background:#000a05;padding:1px 4px;color:${PINK}">$1</code>`)
    .replace(/^### (.*)$/gm, `<h3 style="color:${PINK};margin:12px 0 4px">$1</h3>`)
    .replace(/^## (.*)$/gm, `<h2 style="color:${NEON};font-size:1.3em;margin:12px 0 4px">$1</h2>`)
    .replace(/^# (.*)$/gm, `<h1 style="color:${NEON};font-size:1.6em;margin:16px 0 8px">$1</h1>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^> (.*)$/gm, `<blockquote style="border-left:3px solid ${PINK};padding-left:12px;color:${NEON_DIM};margin:8px 0">$1</blockquote>`)
    .replace(/^[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul style="margin:8px 0 8px 20px">${m}</ul>`)
    .replace(/\n\n/g, "<br><br>");
  return h;
}

function LoremTool({ toast }: { toast: (s: string) => void }) {
  const [paragraphs, setParagraphs] = useState(3);
  const [type, setType] = useState<"lorem"|"hacker"|"corporate">("lorem");
  const text = useMemo(() => genLorem(paragraphs, type), [paragraphs, type]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex gap-2 items-center flex-wrap">
        <Label>STYLE</Label>
        {(["lorem","hacker","corporate"] as const).map(t => (
          <Btn key={t} kind={type===t?"primary":"ghost"} onClick={() => setType(t)}>{t.toUpperCase()}</Btn>
        ))}
        <Label>PARAGRAPHS</Label>
        <div style={{ width: 80 }}><In value={String(paragraphs)} onChange={(v:string)=>setParagraphs(Math.max(1,Math.min(20,parseInt(v)||1)))} type="number" /></div>
        <Btn onClick={() => copy(text, toast)}>COPY</Btn>
      </div>
      <Pane title={`${text.split(/\s+/).length} WORDS · ${text.length} CHARS`}><TA value={text} readOnly rows={20} mono={false} /></Pane>
    </div>
  );
}

function genLorem(n: number, type: string): string {
  const pools: Record<string,string[]> = {
    lorem: ["lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit","sed","do","eiusmod","tempor","incididunt","ut","labore","et","dolore","magna","aliqua","enim","ad","minim","veniam","quis","nostrud","exercitation","ullamco","laboris","nisi","aliquip","ex","ea","commodo","consequat"],
    hacker: ["bypass","payload","exploit","handshake","encrypted","decrypt","firewall","tunnel","kernel","subnet","entropy","stack","heap","buffer","overflow","injection","backdoor","root","sudo","grep","awk","sed","pipe","fork","mutex","thread","daemon","cron","systemd","ssh","tls","mtls","oauth","jwt","kerberos","subnet","vlan"],
    corporate: ["synergize","leverage","stakeholder","deliverable","actionable","scalable","disrupt","pivot","ideate","streamline","optimize","onboard","drill","down","circle","back","touch","base","bandwidth","alignment","kpi","quarter","roadmap","strategic","initiative","framework","ecosystem","value","proposition"],
  };
  const words = pools[type] || pools.lorem;
  const para = () => {
    const sentCount = 3 + Math.floor(Math.random()*4);
    const sents: string[] = [];
    for (let s = 0; s < sentCount; s++) {
      const len = 6 + Math.floor(Math.random()*12);
      const w: string[] = [];
      for (let i = 0; i < len; i++) w.push(words[Math.floor(Math.random()*words.length)]);
      w[0] = w[0][0].toUpperCase()+w[0].slice(1);
      sents.push(w.join(" ")+".");
    }
    return sents.join(" ");
  };
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(para());
  return out.join("\n\n");
}

// ───────────── Azure / Microsoft tools ─────────────

function AzResourceIdTool({ toast }: { toast: (s: string) => void }) {
  const [input, setInput] = useState("/subscriptions/3f9b8e2a-1234-4567-89ab-cdef01234567/resourceGroups/turbo-prod-rg/providers/Microsoft.Web/sites/turboanswergroup");
  const parsed = useMemo(() => {
    const s = input.trim().replace(/^\/+|\/+$/g, "");
    if (!s) return null;
    const segs = s.split("/");
    if (segs.length < 2 || segs[0].toLowerCase() !== "subscriptions") {
      return { error: "Resource ID must start with /subscriptions/{guid}/..." };
    }
    const out: Record<string,string> = {};
    out.subscription = segs[1] || "";
    if (segs[2]?.toLowerCase() === "resourcegroups") out.resourceGroup = segs[3] || "";
    const provIdx = segs.findIndex(s => s.toLowerCase() === "providers");
    if (provIdx >= 0) {
      out.provider = segs[provIdx + 1] || "";
      const after = segs.slice(provIdx + 2);
      if (after.length >= 2) {
        out.resourceType = `${out.provider}/${after[0]}`;
        out.resourceName = after[1];
        if (after.length > 2) out.subResource = after.slice(2).join("/");
      }
    }
    out.portalUrl = `https://portal.azure.com/#@/resource${input.startsWith("/") ? input : "/"+input}/overview`;
    out.cliShow = out.resourceGroup && out.resourceName
      ? `az resource show --ids ${input.startsWith("/") ? input : "/"+input}`
      : "(insufficient info for CLI)";
    return out;
  }, [input]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="AZURE RESOURCE ID">
        <TA value={input} onChange={setInput} rows={4} placeholder="/subscriptions/{sub}/resourceGroups/{rg}/providers/{ns}/{type}/{name}" />
      </Pane>
      {parsed?.error && <Pane title="⨯ INVALID"><div className="text-xs" style={{ color: RED, fontFamily: MONO }}>{parsed.error}</div></Pane>}
      {parsed && !parsed.error && (
        <Pane title="PARSED">
          <div className="text-xs" style={{ fontFamily: MONO }}>
            {Object.entries(parsed).map(([k,v]) => v && (
              <div key={k} className="flex gap-3 py-1.5 px-2 cursor-pointer hover:bg-white/5" onClick={() => copy(String(v), toast)}>
                <div style={{ color: PINK, width: 130 }}>{k.toUpperCase()}</div>
                <div style={{ color: NEON, flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{String(v)}</div>
              </div>
            ))}
          </div>
        </Pane>
      )}
    </div>
  );
}

const AAD_CLAIMS: Record<string,string> = {
  aud: "Audience — the app this token was issued for (your client_id)",
  iss: "Issuer — should be https://login.microsoftonline.com/{tenantId}/v2.0",
  iat: "Issued At (epoch sec)",
  nbf: "Not Before — token invalid before this time",
  exp: "Expires At (epoch sec)",
  aio: "Internal AAD telemetry token (ignore in client logic)",
  appid: "Application (client) ID that requested the token",
  appidacr: "How the app was authenticated: 0=public, 1=client_secret, 2=client_cert",
  idp: "Identity provider (e.g. live.com, AAD tenant)",
  ipaddr: "IP address the user signed in from",
  name: "Display name of the user",
  oid: "Object ID — IMMUTABLE user identifier across all apps in tenant",
  scp: "Scopes (delegated permissions) granted to the app",
  roles: "App roles assigned to the user/app (use this for authorization!)",
  sub: "Subject — unique per (user, app) pair, NOT a real user ID",
  tid: "Tenant ID — which Entra tenant the user belongs to",
  unique_name: "Legacy: user's UPN (use preferred_username instead)",
  preferred_username: "User's UPN / email — display only, not a stable ID",
  uti: "Token unique identifier (anti-replay)",
  ver: "Token version (1.0 or 2.0)",
  acr: "Authentication context class (MFA strength)",
  amr: "Authentication methods (pwd, mfa, otp, etc.)",
  groups: "Group object IDs the user belongs to",
  wids: "Tenant-wide directory role IDs (e.g. global admin)",
  hasgroups: "True if groups were too many to embed (call MS Graph)",
  family_name: "User's last name",
  given_name: "User's first name",
  email: "User's email (not always present, prefer preferred_username)",
  azp: "Authorized party — same as appid",
  azpacr: "Same as appidacr",
  rh: "Refresh hint (AAD internal)",
};

function AadTokenTool({ toast }: { toast: (s: string) => void }) {
  const [tok, setTok] = useState("");
  const decoded = useMemo(() => {
    if (!tok.trim()) return null;
    const parts = tok.trim().split(".");
    if (parts.length !== 3) return { error: "Not a JWT — expected 3 dot-separated segments" };
    try {
      const header = JSON.parse(b64urlDecode(parts[0]));
      const payload = JSON.parse(b64urlDecode(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      const isMS = String(payload.iss || "").includes("login.microsoftonline") || !!payload.tid;
      return { header, payload, isMS, now, expired: payload.exp ? payload.exp < now : null };
    } catch (e: any) { return { error: e.message }; }
  }, [tok]);

  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="ENTRA / AAD TOKEN">
        <TA value={tok} onChange={setTok} placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs..." rows={6} />
      </Pane>
      {decoded?.error && <Pane title="⨯ ERROR"><div className="text-xs" style={{ color: RED, fontFamily: MONO }}>{decoded.error}</div></Pane>}
      {decoded && !decoded.error && (
        <>
          <Pane title={`CLAIMS · ${decoded.isMS ? "✓ ENTRA TOKEN DETECTED" : "non-MS JWT"}`}>
            {decoded.expired !== null && (
              <div className="mb-3 px-3 py-2 text-xs" style={{ color: decoded.expired ? RED : NEON, border: `1px solid ${decoded.expired ? RED : NEON}`, background: `${decoded.expired ? RED : NEON}11`, fontFamily: MONO }}>
                {decoded.expired ? `⨯ EXPIRED ${decoded.now - decoded.payload.exp}s ago` : `✓ VALID · expires in ${Math.round((decoded.payload.exp - decoded.now)/60)}m`}
              </div>
            )}
            <div className="text-xs" style={{ fontFamily: MONO }}>
              {Object.entries(decoded.payload).map(([k, v]) => {
                const explain = AAD_CLAIMS[k];
                const val = typeof v === "string" ? v : JSON.stringify(v);
                const isTime = ["iat","nbf","exp"].includes(k);
                const display = isTime && typeof v === "number" ? `${v} (${new Date(v * 1000).toISOString()})` : val;
                return (
                  <div key={k} className="py-2 px-2 cursor-pointer hover:bg-white/5 border-b" style={{ borderColor: `${BORDER}55` }} onClick={() => copy(val, toast)}>
                    <div className="flex gap-3 items-baseline">
                      <span style={{ color: PINK, width: 140, fontWeight: 700 }}>{k}</span>
                      <span style={{ color: NEON, flex: 1, wordBreak: "break-all" }}>{display}</span>
                    </div>
                    {explain && <div className="mt-1" style={{ color: MUTED, marginLeft: 152 }}>// {explain}</div>}
                  </div>
                );
              })}
            </div>
          </Pane>
          <Pane title="HEADER" actions={<Btn onClick={() => copy(JSON.stringify(decoded.header, null, 2), toast)}>COPY</Btn>}>
            <pre className="text-xs p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON_DIM, fontFamily: MONO, whiteSpace: "pre-wrap" }}>{JSON.stringify(decoded.header, null, 2)}</pre>
          </Pane>
        </>
      )}
    </div>
  );
}

const KQL_SNIPPETS = [
  { name: "Errors in last 1h", category: "App Insights", q: `traces\n| where timestamp > ago(1h)\n| where severityLevel >= 3\n| project timestamp, message, cloud_RoleName, operation_Id\n| order by timestamp desc\n| take 100` },
  { name: "Slowest API endpoints (p95)", category: "App Insights", q: `requests\n| where timestamp > ago(24h)\n| summarize p95 = percentile(duration, 95), count() by name\n| order by p95 desc\n| take 20` },
  { name: "Failed sign-ins by user", category: "AAD Logs", q: `SigninLogs\n| where ResultType != 0\n| where TimeGenerated > ago(7d)\n| summarize Attempts = count() by UserPrincipalName, ResultType, ResultDescription\n| order by Attempts desc` },
  { name: "Resource modifications", category: "Activity Log", q: `AzureActivity\n| where TimeGenerated > ago(24h)\n| where OperationNameValue endswith "/write" or OperationNameValue endswith "/delete"\n| project TimeGenerated, Caller, OperationNameValue, ResourceGroup, Resource\n| order by TimeGenerated desc` },
  { name: "App Service CPU spikes", category: "Metrics", q: `AzureMetrics\n| where ResourceProvider == "MICROSOFT.WEB"\n| where MetricName == "CpuPercentage"\n| where TimeGenerated > ago(6h)\n| summarize avg(Average), max(Maximum) by bin(TimeGenerated, 5m), Resource\n| order by TimeGenerated desc` },
  { name: "Function App invocation rate", category: "Functions", q: `FunctionAppLogs\n| where TimeGenerated > ago(1h)\n| where Category == "Function.Started"\n| summarize Invocations = count() by bin(TimeGenerated, 1m), FunctionName\n| render timechart` },
  { name: "Storage account egress", category: "Storage", q: `StorageBlobLogs\n| where TimeGenerated > ago(24h)\n| where OperationName == "GetBlob"\n| summarize TotalEgressMB = sum(ResponseBodySize)/1024/1024 by AccountName\n| order by TotalEgressMB desc` },
  { name: "Exceptions by type", category: "App Insights", q: `exceptions\n| where timestamp > ago(24h)\n| summarize Count = count() by type, outerMessage\n| order by Count desc\n| take 25` },
  { name: "Cosmos DB RU consumption", category: "Cosmos", q: `AzureDiagnostics\n| where ResourceProvider == "MICROSOFT.DOCUMENTDB"\n| where Category == "DataPlaneRequests"\n| summarize TotalRU = sum(todouble(requestCharge_s)) by databaseName_s, collectionName_s\n| order by TotalRU desc` },
  { name: "Network Security Group denies", category: "Network", q: `AzureNetworkAnalytics_CL\n| where SubType_s == "FlowLog" and FlowStatus_s == "D"\n| summarize Denies = count() by NSGName_s, SrcIP_s\n| order by Denies desc\n| take 50` },
  { name: "Dependency call failures", category: "App Insights", q: `dependencies\n| where timestamp > ago(6h)\n| where success == false\n| summarize Failures = count() by target, type, resultCode\n| order by Failures desc` },
  { name: "Page load p95 by browser", category: "App Insights", q: `pageViews\n| where timestamp > ago(24h)\n| summarize p95 = percentile(duration, 95) by client_Browser\n| order by p95 desc` },
  { name: "Conditional Access blocks", category: "AAD Logs", q: `SigninLogs\n| where TimeGenerated > ago(7d)\n| where ConditionalAccessStatus == "failure"\n| project TimeGenerated, UserPrincipalName, AppDisplayName, ConditionalAccessPolicies\n| take 100` },
  { name: "Privileged role activations", category: "AAD Logs", q: `AuditLogs\n| where TimeGenerated > ago(7d)\n| where OperationName has "Add member to role"\n| project TimeGenerated, InitiatedBy, TargetResources` },
  { name: "Key Vault access denied", category: "Security", q: `AzureDiagnostics\n| where ResourceProvider == "MICROSOFT.KEYVAULT"\n| where ResultType != "Success"\n| project TimeGenerated, OperationName, identity_claim_upn_s, ResultType` },
  { name: "AKS pod restarts", category: "AKS", q: `KubePodInventory\n| where TimeGenerated > ago(6h)\n| where PodRestartCount > 0\n| project TimeGenerated, Namespace, Name, PodRestartCount\n| order by PodRestartCount desc` },
  { name: "Container CPU > 80%", category: "AKS", q: `Perf\n| where ObjectName == "K8SContainer" and CounterName == "cpuUsageNanoCores"\n| summarize avg(CounterValue) by InstanceName, bin(TimeGenerated, 5m)\n| where avg_CounterValue > 800000000` },
  { name: "Event Hub throttling", category: "Event Hub", q: `AzureMetrics\n| where ResourceProvider == "MICROSOFT.EVENTHUB"\n| where MetricName == "ThrottledRequests"\n| summarize sum(Total) by bin(TimeGenerated, 5m), Resource` },
  { name: "Service Bus dead-letters", category: "Service Bus", q: `AzureMetrics\n| where ResourceProvider == "MICROSOFT.SERVICEBUS"\n| where MetricName == "DeadletteredMessages"\n| summarize max(Maximum) by Resource\n| order by max_Maximum desc` },
  { name: "SQL DB long-running queries", category: "SQL", q: `AzureDiagnostics\n| where ResourceProvider == "MICROSOFT.SQL"\n| where Category == "QueryStoreRuntimeStatistics"\n| where duration_d > 10000\n| project TimeGenerated, statement_s, duration_d` },
  { name: "App Service 5xx", category: "App Service", q: `AppServiceHTTPLogs\n| where TimeGenerated > ago(1h)\n| where ScStatus >= 500\n| summarize Count = count() by CsHost, ScStatus, CsUriStem\n| order by Count desc` },
  { name: "Front Door / WAF blocks", category: "Security", q: `AzureDiagnostics\n| where ResourceType == "FRONTDOORS" and action_s == "Block"\n| summarize Blocks = count() by clientIP_s, ruleName_s\n| order by Blocks desc\n| take 50` },
  { name: "Defender for Cloud alerts", category: "Security", q: `SecurityAlert\n| where TimeGenerated > ago(7d)\n| project TimeGenerated, AlertSeverity, AlertName, ResourceId, Description\n| order by TimeGenerated desc` },
  { name: "Unused resources (cost)", category: "Cost", q: `AzureMetrics\n| where TimeGenerated > ago(30d)\n| where MetricName == "Percentage CPU"\n| summarize maxCpu = max(Maximum) by Resource\n| where maxCpu < 5\n| order by maxCpu asc` },
  { name: "Cosmos throttled (429)", category: "Cosmos", q: `AzureDiagnostics\n| where ResourceProvider == "MICROSOFT.DOCUMENTDB"\n| where statusCode_s == "429"\n| summarize Throttles = count() by databaseName_s, collectionName_s, bin(TimeGenerated, 5m)` },
  { name: "Storage 403 forbidden", category: "Storage", q: `StorageBlobLogs\n| where TimeGenerated > ago(24h)\n| where StatusCode == 403\n| summarize Count = count() by CallerIpAddress, AuthenticationType\n| order by Count desc` },
  { name: "API Management latency", category: "APIM", q: `ApiManagementGatewayLogs\n| where TimeGenerated > ago(1h)\n| summarize p95 = percentile(TotalTime, 95), p50 = percentile(TotalTime, 50) by OperationName\n| order by p95 desc` },
  { name: "Log volume by table", category: "Cost", q: `Usage\n| where TimeGenerated > ago(7d)\n| where IsBillable == true\n| summarize GB = sum(Quantity)/1024 by DataType\n| order by GB desc` },
  { name: "Pipeline run failures (DevOps)", category: "DevOps", q: `AzureDevOpsAuditing\n| where TimeGenerated > ago(7d)\n| where ActionId == "Pipelines.RunFailed"\n| project TimeGenerated, ActorDisplayName, Data` },
  { name: "Custom metric anomaly", category: "App Insights", q: `customMetrics\n| where timestamp > ago(24h)\n| summarize avg(value), stdev(value) by name, bin(timestamp, 5m)\n| where avg_value > stdev_value * 3` },
];

function KqlTool({ toast }: { toast: (s: string) => void }) {
  const [active, setActive] = useState(0);
  const [q, setQ] = useState(KQL_SNIPPETS[0].q);
  const pick = (i: number) => { setActive(i); setQ(KQL_SNIPPETS[i].q); };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3 h-full">
      <Pane title="SNIPPETS LIBRARY">
        <div className="space-y-0.5 text-xs" style={{ fontFamily: MONO }}>
          {KQL_SNIPPETS.map((s, i) => (
            <div key={i} onClick={() => pick(i)} className="px-2 py-1.5 cursor-pointer"
              style={{
                background: active === i ? `${NEON}18` : "transparent",
                color: active === i ? NEON : NEON_DIM,
                borderLeft: `2px solid ${active === i ? NEON : "transparent"}`,
              }}>
              <div>{s.name}</div>
              <div style={{ color: MUTED, fontSize: 9 }}>// {s.category}</div>
            </div>
          ))}
        </div>
      </Pane>
      <Pane title={`KQL // ${KQL_SNIPPETS[active].category} // ${KQL_SNIPPETS[active].name}`} actions={<Btn onClick={() => copy(q, toast)}>COPY</Btn>}>
        <TA value={q} onChange={setQ} rows={20} />
        <div className="mt-3 text-[10px]" style={{ color: MUTED, fontFamily: MONO }}>
          // {q.split("\n").length} lines · {q.length} chars · paste into Log Analytics / App Insights / Sentinel
        </div>
      </Pane>
    </div>
  );
}

function ArmLintTool() {
  const [src, setSrc] = useState(`{\n  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",\n  "resources": [\n    {\n      "type": "Microsoft.Storage/storageAccounts",\n      "name": "mystorage",\n      "location": "eastus",\n      "properties": {\n        "allowBlobPublicAccess": true,\n        "minimumTlsVersion": "TLS1_0",\n        "supportsHttpsTrafficOnly": false\n      }\n    },\n    {\n      "type": "Microsoft.Web/sites",\n      "name": "mywebapp",\n      "properties": {\n        "siteConfig": {\n          "appSettings": [\n            { "name": "DB_PASSWORD", "value": "P@ssw0rd123!" }\n          ]\n        }\n      }\n    }\n  ]\n}`);
  const findings = useMemo(() => lintArm(src), [src]);
  const counts = { high: findings.filter(f => f.sev === "HIGH").length, med: findings.filter(f => f.sev === "MED").length, low: findings.filter(f => f.sev === "LOW").length };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
      <Pane title="ARM / BICEP TEMPLATE (JSON)">
        <TA value={src} onChange={setSrc} rows={26} />
      </Pane>
      <Pane title={`FINDINGS · ${counts.high}H ${counts.med}M ${counts.low}L`}>
        {findings.length === 0 && <div className="text-xs" style={{ color: NEON, fontFamily: MONO }}>✓ no issues detected</div>}
        <div className="space-y-2 text-xs" style={{ fontFamily: MONO }}>
          {findings.map((f, i) => {
            const col = f.sev === "HIGH" ? RED : f.sev === "MED" ? WARN : NEON_DIM;
            return (
              <div key={i} className="p-2" style={{ background: `${col}11`, border: `1px solid ${col}55` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: col, fontWeight: 700 }}>[{f.sev}]</span>
                  <span style={{ color: NEON }}>{f.rule}</span>
                </div>
                <div style={{ color: NEON_DIM }}>{f.detail}</div>
                {f.fix && <div className="mt-1" style={{ color: PINK }}>→ {f.fix}</div>}
              </div>
            );
          })}
        </div>
      </Pane>
    </div>
  );
}

function lintArm(src: string): { sev: "HIGH"|"MED"|"LOW"; rule: string; detail: string; fix?: string }[] {
  const out: { sev: "HIGH"|"MED"|"LOW"; rule: string; detail: string; fix?: string }[] = [];
  if (!src.trim()) return out;
  try { JSON.parse(src); } catch (e: any) { return [{ sev: "HIGH", rule: "PARSE_ERROR", detail: e.message }]; }
  const s = src;
  const secretRe = /"(password|pwd|secret|apikey|api_key|connectionstring|sas|token)"\s*:\s*"[^"$\[][^"]{4,}"/gi;
  const secretMatches = s.match(secretRe);
  if (secretMatches) out.push({ sev: "HIGH", rule: "HARDCODED_SECRET", detail: `${secretMatches.length} potential secret(s) hardcoded in template.`, fix: "Move to Key Vault: @Microsoft.KeyVault(VaultName=...;SecretName=...)" });
  if (/"value"\s*:\s*"[^"$\[][^"]*p[a@]ss[w0]rd/gi.test(s)) out.push({ sev: "HIGH", rule: "PASSWORD_VALUE", detail: "appSetting value looks like a hardcoded password.", fix: "Use Key Vault reference or parameter with secureString." });
  if (/"allowBlobPublicAccess"\s*:\s*true/i.test(s)) out.push({ sev: "HIGH", rule: "STORAGE_PUBLIC_BLOB", detail: "Storage account allows public blob access — anyone on the internet can read blobs.", fix: 'Set "allowBlobPublicAccess": false unless explicitly intended.' });
  if (/"supportsHttpsTrafficOnly"\s*:\s*false/i.test(s)) out.push({ sev: "HIGH", rule: "STORAGE_HTTP_ALLOWED", detail: "Storage account allows HTTP traffic.", fix: 'Set "supportsHttpsTrafficOnly": true.' });
  if (/"minimumTlsVersion"\s*:\s*"TLS1_[01]"/i.test(s)) out.push({ sev: "HIGH", rule: "WEAK_TLS", detail: "minimumTlsVersion is TLS 1.0 or 1.1 — deprecated and insecure.", fix: 'Use "TLS1_2" (or "TLS1_3" where supported).' });
  if (/"publicNetworkAccess"\s*:\s*"Enabled"/i.test(s)) out.push({ sev: "MED", rule: "PUBLIC_NETWORK_ACCESS", detail: "Resource reachable from the public internet.", fix: "Set to Disabled and use Private Endpoints + VNet integration." });
  if (/"sku"\s*:\s*\{[^}]*"name"\s*:\s*"F1"/i.test(s)) out.push({ sev: "LOW", rule: "FREE_TIER_PROD", detail: "App Service Plan F1 (Free) — no SLA, no scaling, no custom domains.", fix: 'Use at least "B1" for prod or "P1v3" for production-grade workloads.' });
  if (/"location"\s*:\s*"[a-zA-Z]+"/.test(s) && !/"location"\s*:\s*"\[resourceGroup\(\)\.location\]"/.test(s) && !/"location"\s*:\s*"\[parameters/.test(s)) {
    out.push({ sev: "LOW", rule: "HARDCODED_LOCATION", detail: "Location is hardcoded rather than parameterised.", fix: `Use "[parameters('location')]" or "[resourceGroup().location]".` });
  }
  const resources = (s.match(/"type"\s*:\s*"Microsoft\./g) || []).length;
  const tagged = (s.match(/"tags"\s*:\s*\{/g) || []).length;
  if (resources > 0 && tagged < resources) out.push({ sev: "LOW", rule: "MISSING_TAGS", detail: `${resources - tagged} of ${resources} resources have no tags.`, fix: 'Add "tags": { "env": "...", "owner": "..." } for cost tracking.' });
  if (!/diagnosticSettings/i.test(s) && resources > 0) out.push({ sev: "MED", rule: "NO_DIAGNOSTICS", detail: "No diagnosticSettings found — logs won't reach Log Analytics.", fix: "Add Microsoft.Insights/diagnosticSettings pointing at a Log Analytics workspace." });
  if (/Microsoft\.Web\/sites/.test(s) && !/"identity"\s*:\s*\{[^}]*"type"\s*:\s*"SystemAssigned"/.test(s)) {
    out.push({ sev: "MED", rule: "NO_MANAGED_IDENTITY", detail: "Web app has no managed identity — auth to other Azure services will rely on connection strings.", fix: 'Add "identity": { "type": "SystemAssigned" } and use Key Vault references.' });
  }
  return out;
}

// ───────────── Storage SAS codec (HMAC-SHA256) ─────────────

async function hmacSha256B64(keyB64: string, message: string): Promise<string> {
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function AzSasTool({ toast }: { toast: (s: string) => void }) {
  const [mode, setMode] = useState<"gen"|"decode">("gen");
  // Generator state
  const [account, setAccount] = useState("mystorageacct");
  const [key, setKey] = useState("");
  const [container, setContainer] = useState("uploads");
  const [blob, setBlob] = useState("file.txt");
  const [perms, setPerms] = useState("r");
  const [expiryHours, setExpiryHours] = useState(1);
  const [protocol, setProtocol] = useState<"https"|"https,http">("https");
  const [result, setResult] = useState<{ url: string; sig: string; sts: string } | null>(null);
  const [err, setErr] = useState("");

  const generate = async () => {
    setErr(""); setResult(null);
    try {
      if (!account.trim() || !key.trim()) throw new Error("account + key required");
      const now = new Date();
      const start = new Date(now.getTime() - 5 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
      const expiry = new Date(now.getTime() + expiryHours * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
      const canonicalizedResource = `/blob/${account}/${container}/${blob}`;
      const signedVersion = "2021-12-02";
      const stringToSign = [
        perms, start, expiry, canonicalizedResource,
        "", "", "", protocol, signedVersion,
        "b", "", "", "", "", "", "",
      ].join("\n");
      const sig = await hmacSha256B64(key, stringToSign);
      const qp = new URLSearchParams({
        sv: signedVersion, st: start, se: expiry, sr: "b", sp: perms, spr: protocol, sig,
      });
      const url = `https://${account}.blob.core.windows.net/${container}/${blob}?${qp.toString()}`;
      setResult({ url, sig, sts: stringToSign });
    } catch (e: any) {
      setErr(e.message);
    }
  };

  // Decoder state
  const [sasIn, setSasIn] = useState("");
  const decoded = useMemo(() => {
    if (!sasIn.trim()) return null;
    try {
      const u = new URL(sasIn.trim());
      const out: Record<string,string> = { host: u.host, path: u.pathname };
      const labels: Record<string,string> = {
        sv: "signedVersion", st: "signedStart", se: "signedExpiry", sr: "signedResource",
        sp: "signedPermissions", sig: "signature", spr: "signedProtocol", sip: "signedIp",
        ss: "signedServices", srt: "signedResourceTypes", sktid: "signedKeyTenantId",
        si: "signedIdentifier", skoid: "signedKeyObjectId", sks: "signedKeyService",
        skv: "signedKeyVersion", saoid: "signedAuthObjectId", suoid: "signedUserObjectId",
      };
      const PERM_MAP: Record<string,string> = { r: "Read", w: "Write", d: "Delete", l: "List", a: "Add", c: "Create", u: "Update", p: "Process", t: "Tag", f: "Filter", i: "SetImmutabilityPolicy", x: "DeleteVersion", y: "PermanentDelete" };
      u.searchParams.forEach((v, k) => { out[labels[k] || k] = v; });
      if (out.signedPermissions) out["permissions (expanded)"] = out.signedPermissions.split("").map(p => PERM_MAP[p] || p).join(", ");
      if (out.signedExpiry) {
        const exp = new Date(out.signedExpiry);
        out["status"] = exp < new Date() ? `⨯ EXPIRED (${Math.round((Date.now() - exp.getTime())/3600000)}h ago)` : `✓ VALID (${Math.round((exp.getTime() - Date.now())/3600000)}h remaining)`;
      }
      return out;
    } catch (e: any) { return { error: e.message }; }
  }, [sasIn]);

  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="MODE">
        <div className="flex gap-2">
          <Btn onClick={() => setMode("gen")} kind={mode === "gen" ? "primary" : "ghost"}>⊕ GENERATE</Btn>
          <Btn onClick={() => setMode("decode")} kind={mode === "decode" ? "primary" : "ghost"}>⊖ DECODE</Btn>
        </div>
      </Pane>
      {mode === "gen" ? (
        <>
          <Pane title="SAS PARAMETERS">
            <div className="grid grid-cols-2 gap-3 text-xs" style={{ fontFamily: MONO }}>
              <label style={{ color: NEON_DIM }}>account.name<input className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={account} onChange={e => setAccount(e.target.value)} /></label>
              <label style={{ color: NEON_DIM }}>account.key (base64)<input type="password" className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={key} onChange={e => setKey(e.target.value)} placeholder="abc...==" /></label>
              <label style={{ color: NEON_DIM }}>container<input className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={container} onChange={e => setContainer(e.target.value)} /></label>
              <label style={{ color: NEON_DIM }}>blob<input className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={blob} onChange={e => setBlob(e.target.value)} /></label>
              <label style={{ color: NEON_DIM }}>permissions [racwdl]<input className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={perms} onChange={e => setPerms(e.target.value)} /></label>
              <label style={{ color: NEON_DIM }}>expiry (hours)<input type="number" className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={expiryHours} onChange={e => setExpiryHours(Number(e.target.value) || 1)} /></label>
              <label style={{ color: NEON_DIM }}>protocol
                <select className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={protocol} onChange={e => setProtocol(e.target.value as any)}>
                  <option value="https">https</option>
                  <option value="https,http">https,http</option>
                </select>
              </label>
            </div>
            <div className="mt-3"><Btn onClick={generate} kind="primary">⚡ FORGE SAS TOKEN</Btn></div>
          </Pane>
          {err && <Pane title="⨯ ERROR"><div className="text-xs" style={{ color: RED, fontFamily: MONO }}>{err}</div></Pane>}
          {result && (
            <>
              <Pane title="SIGNED URL" actions={<Btn onClick={() => copy(result.url, toast)}>COPY</Btn>}>
                <pre className="text-xs p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{result.url}</pre>
              </Pane>
              <Pane title="STRING-TO-SIGN (debug)">
                <pre className="text-xs p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON_DIM, fontFamily: MONO, whiteSpace: "pre-wrap" }}>{result.sts.replace(/\n/g, "\\n\n")}</pre>
              </Pane>
            </>
          )}
        </>
      ) : (
        <>
          <Pane title="SAS URL"><TA value={sasIn} onChange={setSasIn} rows={4} placeholder="https://account.blob.core.windows.net/c/b?sv=...&sig=..." /></Pane>
          {decoded && (
            <Pane title={decoded.error ? "⨯ INVALID" : "DECODED PARAMETERS"}>
              {decoded.error ? <div className="text-xs" style={{ color: RED, fontFamily: MONO }}>{decoded.error}</div> : (
                <div className="text-xs" style={{ fontFamily: MONO }}>
                  {Object.entries(decoded).map(([k, v]) => (
                    <div key={k} className="flex gap-3 py-1.5 px-2 hover:bg-white/5 cursor-pointer" onClick={() => copy(String(v), toast)}>
                      <div style={{ color: PINK, width: 200 }}>{k}</div>
                      <div style={{ color: NEON, flex: 1, wordBreak: "break-all" }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Pane>
          )}
        </>
      )}
    </div>
  );
}

// ───────────── IAC transmute (ARM ⇄ Bicep, structural) ─────────────

function armToBicep(armJson: string): string {
  const t = JSON.parse(armJson);
  const lines: string[] = [];
  const params = t.parameters || {};
  for (const [k, v] of Object.entries<any>(params)) {
    const type = v.type || "string";
    const def = v.defaultValue !== undefined ? ` = ${JSON.stringify(v.defaultValue)}` : "";
    lines.push(`param ${k} ${type}${def}`);
  }
  if (lines.length) lines.push("");
  for (const r of (t.resources || [])) {
    const symbolic = (r.name || "res").replace(/[^a-zA-Z0-9]/g, "_");
    const apiVersion = r.apiVersion || "2023-01-01";
    lines.push(`resource ${symbolic} '${r.type}@${apiVersion}' = {`);
    lines.push(`  name: ${JSON.stringify(r.name)}`);
    if (r.location) lines.push(`  location: ${JSON.stringify(r.location)}`);
    if (r.sku) lines.push(`  sku: ${JSON.stringify(r.sku, null, 2).split("\n").map((l,i) => i === 0 ? l : "  " + l).join("\n")}`);
    if (r.properties) lines.push(`  properties: ${JSON.stringify(r.properties, null, 2).split("\n").map((l,i) => i === 0 ? l : "  " + l).join("\n")}`);
    if (r.tags) lines.push(`  tags: ${JSON.stringify(r.tags, null, 2).split("\n").map((l,i) => i === 0 ? l : "  " + l).join("\n")}`);
    lines.push(`}`);
    lines.push("");
  }
  return lines.join("\n");
}

function bicepToArm(bicep: string): string {
  const resources: any[] = [];
  const params: Record<string, any> = {};
  const paramRe = /^param\s+(\w+)\s+(\w+)(?:\s*=\s*(.+))?$/gm;
  let pm; while ((pm = paramRe.exec(bicep)) !== null) {
    params[pm[1]] = { type: pm[2], ...(pm[3] ? { defaultValue: JSON.parse(pm[3]) } : {}) };
  }
  const resRe = /resource\s+\w+\s+'([^']+)@([^']+)'\s*=\s*\{([\s\S]*?)\n\}/gm;
  let rm; while ((rm = resRe.exec(bicep)) !== null) {
    const type = rm[1]; const apiVersion = rm[2]; const body = rm[3];
    const grab = (key: string) => {
      const re = new RegExp(`\\n\\s*${key}\\s*:\\s*([\\s\\S]*?)(?=\\n  \\w+\\s*:|$)`);
      const m = body.match(re);
      if (!m) return undefined;
      const raw = m[1].trim();
      try { return JSON.parse(raw); } catch { return raw.replace(/^['"]|['"]$/g, ""); }
    };
    const res: any = { type, apiVersion, name: grab("name") };
    const loc = grab("location"); if (loc) res.location = loc;
    const sku = grab("sku"); if (sku) res.sku = sku;
    const props = grab("properties"); if (props) res.properties = props;
    const tags = grab("tags"); if (tags) res.tags = tags;
    resources.push(res);
  }
  return JSON.stringify({
    $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    contentVersion: "1.0.0.0",
    parameters: params,
    resources,
  }, null, 2);
}

function IacTransmuteTool({ toast }: { toast: (s: string) => void }) {
  const [dir, setDir] = useState<"a2b"|"b2a">("a2b");
  const [src, setSrc] = useState<string>(`{\n  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",\n  "parameters": { "location": { "type": "string", "defaultValue": "eastus" } },\n  "resources": [\n    {\n      "type": "Microsoft.Storage/storageAccounts",\n      "apiVersion": "2023-01-01",\n      "name": "mystg",\n      "location": "[parameters('location')]",\n      "sku": { "name": "Standard_LRS" },\n      "kind": "StorageV2",\n      "properties": { "allowBlobPublicAccess": false, "minimumTlsVersion": "TLS1_2" }\n    }\n  ]\n}`);
  const [out, setOut] = useState(""); const [err, setErr] = useState("");
  const run = () => {
    setErr("");
    try { setOut(dir === "a2b" ? armToBicep(src) : bicepToArm(src)); }
    catch (e: any) { setErr(e.message); setOut(""); }
  };
  useEffect(() => { run(); /* eslint-disable-next-line */ }, [src, dir]);
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="DIRECTION">
        <div className="flex gap-2">
          <Btn onClick={() => setDir("a2b")} kind={dir === "a2b" ? "primary" : "ghost"}>ARM → BICEP</Btn>
          <Btn onClick={() => setDir("b2a")} kind={dir === "b2a" ? "primary" : "ghost"}>BICEP → ARM</Btn>
        </div>
        <div className="mt-2 text-[10px]" style={{ color: WARN, fontFamily: MONO }}>// structural conversion — complex expressions, modules, loops may need manual touch-up.</div>
      </Pane>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
        <Pane title={dir === "a2b" ? "ARM (JSON) INPUT" : "BICEP INPUT"}><TA value={src} onChange={setSrc} rows={22} /></Pane>
        <Pane title={dir === "a2b" ? "BICEP OUTPUT" : "ARM (JSON) OUTPUT"} actions={out && <Btn onClick={() => copy(out, toast)}>COPY</Btn>}>
          {err ? <div className="text-xs" style={{ color: RED, fontFamily: MONO }}>⨯ {err}</div> : <pre className="text-xs p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO, whiteSpace: "pre-wrap" }}>{out}</pre>}
        </Pane>
      </div>
    </div>
  );
}

// ───────────── az CLI synthesizer ─────────────

function shq(s: string): string { return s.replace(/(["`$\\])/g, "\\$1"); }

type CliRecipe = { id: string; label: string; flags: { name: string; placeholder: string; default?: string; required?: boolean }[]; render: (v: Record<string,string>) => string };

const CLI_RECIPES: CliRecipe[] = [
  { id: "rg-create", label: "Create resource group", flags: [
    { name: "name", placeholder: "myRg", required: true },
    { name: "location", placeholder: "eastus", default: "eastus", required: true },
    { name: "tags", placeholder: "env=prod owner=team", default: "" },
  ], render: v => `az group create --name ${v.name} --location ${v.location}${v.tags ? ` --tags ${v.tags}` : ""}` },
  { id: "storage-create", label: "Create storage account", flags: [
    { name: "name", placeholder: "mystorage123", required: true },
    { name: "resource-group", placeholder: "myRg", required: true },
    { name: "location", placeholder: "eastus", default: "eastus" },
    { name: "sku", placeholder: "Standard_LRS", default: "Standard_LRS" },
    { name: "min-tls-version", placeholder: "TLS1_2", default: "TLS1_2" },
  ], render: v => `az storage account create --name ${v.name} --resource-group ${v["resource-group"]} --location ${v.location} --sku ${v.sku} --min-tls-version ${v["min-tls-version"]} --allow-blob-public-access false --https-only true` },
  { id: "webapp-create", label: "Create App Service (Linux)", flags: [
    { name: "name", placeholder: "myapp", required: true },
    { name: "resource-group", placeholder: "myRg", required: true },
    { name: "plan", placeholder: "myPlan", required: true },
    { name: "runtime", placeholder: "NODE:20-lts", default: "NODE:20-lts" },
  ], render: v => `az webapp create --name ${v.name} --resource-group ${v["resource-group"]} --plan ${v.plan} --runtime "${v.runtime}"` },
  { id: "sp-create", label: "Service principal w/ role", flags: [
    { name: "name", placeholder: "my-sp", required: true },
    { name: "role", placeholder: "Contributor", default: "Contributor" },
    { name: "scope", placeholder: "/subscriptions/{subId}/resourceGroups/myRg", required: true },
  ], render: v => `az ad sp create-for-rbac --name "${shq(v.name)}" --role "${shq(v.role)}" --scopes "${shq(v.scope)}"` },
  { id: "role-assign", label: "Assign RBAC role", flags: [
    { name: "assignee", placeholder: "user@contoso.com or objectId", required: true },
    { name: "role", placeholder: "Reader", default: "Reader" },
    { name: "scope", placeholder: "/subscriptions/{subId}", required: true },
  ], render: v => `az role assignment create --assignee "${shq(v.assignee)}" --role "${shq(v.role)}" --scope "${shq(v.scope)}"` },
  { id: "kv-create", label: "Create Key Vault + secret", flags: [
    { name: "name", placeholder: "myKv", required: true },
    { name: "resource-group", placeholder: "myRg", required: true },
    { name: "location", placeholder: "eastus", default: "eastus" },
    { name: "secret-name", placeholder: "dbPassword" },
    { name: "secret-value", placeholder: "********" },
  ], render: v => `az keyvault create --name ${v.name} --resource-group ${v["resource-group"]} --location ${v.location} --enable-rbac-authorization true${v["secret-name"] ? `\naz keyvault secret set --vault-name ${v.name} --name ${v["secret-name"]} --value "${v["secret-value"]}"` : ""}` },
  { id: "aks-create", label: "Create AKS cluster", flags: [
    { name: "name", placeholder: "myAks", required: true },
    { name: "resource-group", placeholder: "myRg", required: true },
    { name: "node-count", placeholder: "3", default: "3" },
    { name: "node-vm-size", placeholder: "Standard_DS2_v2", default: "Standard_DS2_v2" },
  ], render: v => `az aks create --name ${v.name} --resource-group ${v["resource-group"]} --node-count ${v["node-count"]} --node-vm-size ${v["node-vm-size"]} --enable-managed-identity --generate-ssh-keys` },
  { id: "login", label: "Login flows", flags: [
    { name: "tenant", placeholder: "{tenantId}", default: "" },
  ], render: v => `# Interactive\naz login${v.tenant ? ` --tenant ${v.tenant}` : ""}\n# Device code (headless / SSH)\naz login --use-device-code${v.tenant ? ` --tenant ${v.tenant}` : ""}\n# Service principal\naz login --service-principal -u {appId} -p {password-or-cert} --tenant ${v.tenant || "{tenantId}"}` },
];

function CliSynthTool({ toast }: { toast: (s: string) => void }) {
  const [activeId, setActiveId] = useState(CLI_RECIPES[0].id);
  const recipe = CLI_RECIPES.find(r => r.id === activeId)!;
  const [values, setValues] = useState<Record<string,string>>({});
  useEffect(() => {
    const init: Record<string,string> = {};
    recipe.flags.forEach(f => { init[f.name] = f.default ?? ""; });
    setValues(init);
  }, [activeId]);
  const cmd = recipe.render(values);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 h-full">
      <Pane title="OPERATION">
        <div className="space-y-0.5 text-xs" style={{ fontFamily: MONO }}>
          {CLI_RECIPES.map(r => (
            <div key={r.id} onClick={() => setActiveId(r.id)} className="px-2 py-1.5 cursor-pointer"
              style={{ background: activeId === r.id ? `${NEON}18` : "transparent", color: activeId === r.id ? NEON : NEON_DIM, borderLeft: `2px solid ${activeId === r.id ? NEON : "transparent"}` }}>
              {r.label}
            </div>
          ))}
        </div>
      </Pane>
      <div className="space-y-3">
        <Pane title={`PARAMETERS · ${recipe.label.toUpperCase()}`}>
          <div className="grid grid-cols-2 gap-3 text-xs" style={{ fontFamily: MONO }}>
            {recipe.flags.map(f => (
              <label key={f.name} style={{ color: NEON_DIM }}>
                --{f.name}{f.required && <span style={{ color: PINK }}> *</span>}
                <input className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }}
                  value={values[f.name] ?? ""} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} placeholder={f.placeholder} />
              </label>
            ))}
          </div>
        </Pane>
        <Pane title="SYNTHESIZED COMMAND" actions={<Btn onClick={() => copy(cmd, toast)}>COPY</Btn>}>
          <pre className="text-xs p-3" style={{ background: "#000a05", border: `1px solid ${NEON}55`, color: NEON, fontFamily: MONO, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{cmd}</pre>
        </Pane>
      </div>
    </div>
  );
}

// ───────────── Service Principal forge ─────────────

function IrmSpTool({ toast }: { toast: (s: string) => void }) {
  const [name, setName] = useState("my-app-sp");
  const [role, setRole] = useState("Contributor");
  const [scope, setScope] = useState("/subscriptions/{subscriptionId}/resourceGroups/{rg}");
  const [years, setYears] = useState(1);
  const cmds = useMemo(() => {
    const n = shq(name), r = shq(role), s = shq(scope);
    return {
      secret: `az ad sp create-for-rbac \\\n  --name "${n}" \\\n  --role "${r}" \\\n  --scopes "${s}" \\\n  --years ${years}`,
      cert: `az ad sp create-for-rbac \\\n  --name "${n}" \\\n  --role "${r}" \\\n  --scopes "${s}" \\\n  --create-cert \\\n  --years ${years}`,
      federated: `# 1. Create the app + SP\nappId=$(az ad app create --display-name "${n}" --query appId -o tsv)\naz ad sp create --id $appId\n# 2. Bind a federated credential (e.g. GitHub Actions)\naz ad app federated-credential create --id $appId --parameters '{\n  "name": "github-main",\n  "issuer": "https://token.actions.githubusercontent.com",\n  "subject": "repo:OWNER/REPO:ref:refs/heads/main",\n  "audiences": ["api://AzureADTokenExchange"]\n}'\n# 3. Grant role\naz role assignment create --assignee $appId --role "${r}" --scope "${s}"`,
      mi: `# System-assigned managed identity (preferred over SP for Azure workloads)\naz webapp identity assign --name MYAPP --resource-group MYRG\nprincipalId=$(az webapp identity show --name MYAPP --resource-group MYRG --query principalId -o tsv)\naz role assignment create --assignee-object-id $principalId --assignee-principal-type ServicePrincipal --role "${r}" --scope "${s}"`,
    };
  }, [name, role, scope, years]);

  const ROLES = ["Owner","Contributor","Reader","User Access Administrator","Storage Blob Data Contributor","Storage Blob Data Reader","Key Vault Secrets User","Key Vault Secrets Officer","Cosmos DB Built-in Data Contributor","AcrPush","AcrPull","Monitoring Reader","Log Analytics Contributor","Network Contributor"];

  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title="PRINCIPAL PARAMETERS">
        <div className="grid grid-cols-2 gap-3 text-xs" style={{ fontFamily: MONO }}>
          <label style={{ color: NEON_DIM }}>display name<input className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={name} onChange={e => setName(e.target.value)} /></label>
          <label style={{ color: NEON_DIM }}>RBAC role
            <select className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="col-span-2" style={{ color: NEON_DIM }}>scope<input className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={scope} onChange={e => setScope(e.target.value)} /></label>
          <label style={{ color: NEON_DIM }}>credential lifetime (years)<input type="number" className="w-full mt-1 px-2 py-1.5" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO }} value={years} onChange={e => setYears(Number(e.target.value) || 1)} /></label>
        </div>
      </Pane>
      <Pane title="◆ CLIENT SECRET (least secure — rotate frequently)" actions={<Btn onClick={() => copy(cmds.secret, toast)}>COPY</Btn>}>
        <pre className="text-xs p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO, whiteSpace: "pre-wrap" }}>{cmds.secret}</pre>
      </Pane>
      <Pane title="◆ CLIENT CERTIFICATE (preferred for non-human workloads)" actions={<Btn onClick={() => copy(cmds.cert, toast)}>COPY</Btn>}>
        <pre className="text-xs p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO, whiteSpace: "pre-wrap" }}>{cmds.cert}</pre>
      </Pane>
      <Pane title="◆ FEDERATED CREDENTIAL (GitHub/GitLab OIDC — no secrets)" actions={<Btn onClick={() => copy(cmds.federated, toast)}>COPY</Btn>}>
        <pre className="text-xs p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO, whiteSpace: "pre-wrap" }}>{cmds.federated}</pre>
      </Pane>
      <Pane title="◆ MANAGED IDENTITY (Azure-native workloads — zero credentials)" actions={<Btn onClick={() => copy(cmds.mi, toast)}>COPY</Btn>}>
        <pre className="text-xs p-2" style={{ background: "#000a05", border: `1px solid ${BORDER}`, color: NEON, fontFamily: MONO, whiteSpace: "pre-wrap" }}>{cmds.mi}</pre>
      </Pane>
    </div>
  );
}

// ───────────── Shared AI-powered tool ─────────────

function AiTool({ kind, placeholder, label, sample, toast }: { kind: string; placeholder: string; label: string; sample: string; toast: (s: string) => void }) {
  const [input, setInput] = useState(sample);
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const run = async () => {
    setErr(""); setOut(""); setLoading(true);
    try {
      const r = await fetch("/api/devtools/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, input }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setOut(j.answer); setUsage({ used: j.used, limit: j.limit });
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="space-y-3 h-full flex flex-col">
      <Pane title={`INPUT // ${label.toUpperCase()}`} actions={
        <div className="flex gap-2 items-center">
          {usage && <span className="text-[10px]" style={{ color: MUTED, fontFamily: MONO }}>// {usage.used}/{usage.limit} queries today</span>}
          <Btn onClick={run} kind="primary">{loading ? "◐ ANALYZING..." : "⚡ INVOKE TURBO"}</Btn>
        </div>
      }>
        <TA value={input} onChange={setInput} placeholder={placeholder} rows={10} />
      </Pane>
      {err && <Pane title="⨯ ERROR"><div className="text-xs" style={{ color: RED, fontFamily: MONO }}>{err}</div></Pane>}
      {(out || loading) && (
        <Pane title="◆ TURBO ANALYSIS" actions={out && <Btn onClick={() => copy(out, toast)}>COPY</Btn>}>
          {loading && !out ? (
            <div className="text-xs" style={{ color: NEON_DIM, fontFamily: MONO }}>[ analyzing input... awaiting model response ]</div>
          ) : (
            <pre className="text-xs p-3" style={{ background: "#000a05", border: `1px solid ${NEON}33`, color: NEON, fontFamily: MONO, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{out}</pre>
          )}
        </Pane>
      )}
    </div>
  );
}

// ───────────── Matrix background ─────────────
function MatrixBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    let w = c.width = window.innerWidth, h = c.height = window.innerHeight;
    const fs = 14, cols = Math.floor(w/fs); const drops = Array(cols).fill(1);
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ";
    const draw = () => {
      ctx.fillStyle = "rgba(5,7,10,0.08)"; ctx.fillRect(0,0,w,h);
      ctx.fillStyle = `${NEON}55`; ctx.font = `${fs}px ${MONO}`;
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random()*chars.length)];
        ctx.fillText(ch, i*fs, drops[i]*fs);
        if (drops[i]*fs > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const id = setInterval(draw, 80);
    const onResize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { clearInterval(id); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none" style={{ opacity: 0.18, zIndex: 0 }} />;
}

// ───────────── status bar + command palette ─────────────
function StatusBar({ active, toast }: { active: ToolId; toast: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  const cpu = (40 + Math.sin(now.getTime()/3000)*20).toFixed(0);
  const mem = (60 + Math.cos(now.getTime()/5000)*15).toFixed(0);
  return (
    <div className="fixed bottom-0 left-0 right-0 flex items-center gap-4 px-4 py-1.5 text-[10px] uppercase tracking-[0.18em]"
      style={{ background: PANEL, borderTop: `1px solid ${BORDER}`, fontFamily: MONO, color: NEON_DIM, zIndex: 50 }}>
      <span style={{ color: NEON }}>● SECURE</span>
      <span>tool: <span style={{ color: PINK }}>{active}</span></span>
      <span>cpu: {cpu}%</span>
      <span>mem: {mem}%</span>
      <span>net: ↑12kb ↓2.3mb</span>
      <span>uplink: <span style={{ color: NEON }}>azure-foundry/eastus2</span></span>
      <span className="ml-auto">{toast && <span style={{ color: PINK }}>» {toast}</span>}</span>
      <span style={{ color: NEON }}>{now.toUTCString().slice(17, 25)} UTC</span>
      <span>v2.4.0-matrix</span>
    </div>
  );
}

function CmdPalette({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: ToolId) => void }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => ALL_TOOLS.filter(t => t.label.toLowerCase().includes(q.toLowerCase()) || t.desc.toLowerCase().includes(q.toLowerCase())).slice(0, 8), [q]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-start justify-center pt-32" style={{ background: "rgba(0,0,0,0.7)", zIndex: 100 }} onClick={onClose}>
      <div className="w-full max-w-xl" style={{ ...cardStyle, boxShadow: `0 0 40px ${NEON}66` }} onClick={e => e.stopPropagation()}>
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="// search tools..." className="w-full px-4 py-3 outline-none text-sm"
          style={{ background: "transparent", color: NEON, fontFamily: MONO, borderBottom: `1px solid ${BORDER}` }} />
        <div className="max-h-96 overflow-auto">
          {results.map(t => (
            <div key={t.id} onClick={() => { onPick(t.id); onClose(); }} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/5"
              style={{ fontFamily: MONO, borderBottom: `1px solid ${BORDER}11` }}>
              <span style={{ color: NEON, width: 20 }}>{t.icon}</span>
              <span style={{ color: NEON }} className="text-sm">{t.label}</span>
              <span style={{ color: MUTED }} className="text-xs ml-auto">{t.desc}</span>
            </div>
          ))}
          {results.length === 0 && <div className="px-4 py-3 text-xs" style={{ color: MUTED, fontFamily: MONO }}>// no matches</div>}
        </div>
      </div>
    </div>
  );
}

// ───────────── main ─────────────
export default function DevTools() {
  const [active, setActive] = useState<ToolId>("jwt");
  const [toast, setToastMsg] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const showToast = useCallback((m: string) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(""), 2000);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setPaletteOpen(o => !o); }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const activeTool = ALL_TOOLS.find(t => t.id === active)!;

  return (
    <div className="min-h-screen relative" style={{ background: BG, color: NEON, fontFamily: MONO }}>
      <MatrixBg />

      {/* TOP BAR */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2.5"
        style={{ background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold cursor-pointer" style={{ color: NEON, textShadow: `0 0 8px ${NEON}` }}>◤ TURBO</Link>
          <span style={{ color: MUTED }} className="text-[10px] uppercase tracking-[0.28em]">// DEVOPS_TOOLKIT v2.4.0</span>
          <span style={{ color: PINK }} className="text-[10px] uppercase tracking-[0.28em]">[matrix.engineer]</span>
        </div>
        <div className="flex items-center gap-3">
          <Btn onClick={() => setPaletteOpen(true)}>⌘K SEARCH</Btn>
          <Link href="/chat" className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]"
            style={{ fontFamily: MONO, border: `1px solid ${BORDER}`, color: NEON_DIM, textDecoration: "none", borderRadius: 2 }}>↩ CHAT</Link>
        </div>
      </div>

      <div className="relative z-10 flex" style={{ minHeight: "calc(100vh - 80px)" }}>
        {/* LEFT RAIL */}
        <aside className="overflow-y-auto" style={{ width: 240, background: PANEL, borderRight: `1px solid ${BORDER}`, maxHeight: "calc(100vh - 80px)" }}>
          {CATEGORIES.map(cat => (
            <div key={cat.name} className="py-2">
              <div className="px-3 py-1.5 text-[9px] uppercase tracking-[0.32em]" style={{ color: MUTED }}>{cat.name}</div>
              {cat.tools.map(t => (
                <div key={t.id} onClick={() => setActive(t.id)}
                  className="flex items-center gap-3 px-3 py-1.5 cursor-pointer text-xs"
                  style={{
                    background: active===t.id ? `${NEON}18` : "transparent",
                    color: active===t.id ? NEON : NEON_DIM,
                    borderLeft: `2px solid ${active===t.id ? NEON : "transparent"}`,
                    boxShadow: active===t.id ? `inset 0 0 16px ${NEON}22` : "none",
                  }}
                  onMouseEnter={e => { if (active!==t.id) (e.currentTarget as HTMLElement).style.background = `${NEON}08`; }}
                  onMouseLeave={e => { if (active!==t.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{ width: 16, color: active===t.id ? PINK : MUTED }}>{t.icon}</span>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="px-3 py-3 text-[9px]" style={{ color: MUTED, borderTop: `1px solid ${BORDER}` }}>
            // ⌘K · open palette<br/>
            // ESC · close<br/>
            // {ALL_TOOLS.length} tools loaded
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-4" style={{ background: BG, minWidth: 0 }}>
          <div className="mb-3 flex items-baseline gap-3">
            <h1 className="text-2xl font-black" style={{ color: NEON, textShadow: `0 0 12px ${NEON}88` }}>{activeTool.label}</h1>
            <span style={{ color: MUTED }} className="text-xs">// {activeTool.desc}</span>
          </div>
          <div style={{ height: "calc(100vh - 200px)" }}>
            {active === "az-resid" && <AzResourceIdTool toast={showToast} />}
            {active === "aad-token" && <AadTokenTool toast={showToast} />}
            {active === "kql" && <KqlTool toast={showToast} />}
            {active === "arm-lint" && <ArmLintTool />}
            {active === "az-sas" && <AzSasTool toast={showToast} />}
            {active === "iac-transmute" && <IacTransmuteTool toast={showToast} />}
            {active === "cli-synth" && <CliSynthTool toast={showToast} />}
            {active === "irm-sp" && <IrmSpTool toast={showToast} />}
            {active === "kql-ai" && <AiTool kind="kql-explain" label="KQL.cogniscan" placeholder="paste any KQL query..." sample={`requests\n| where timestamp > ago(24h)\n| summarize p95 = percentile(duration, 95), count() by name\n| order by p95 desc\n| take 20`} toast={showToast} />}
            {active === "arm-ai" && <AiTool kind="arm-review" label="ARM.sentinel" placeholder="paste ARM or Bicep template..." sample={`{\n  "resources": [{\n    "type": "Microsoft.Web/sites",\n    "name": "myapp",\n    "properties": {\n      "siteConfig": {\n        "appSettings": [{ "name": "DB_PASSWORD", "value": "P@ssw0rd123" }],\n        "minTlsVersion": "1.0"\n      }\n    }\n  }]\n}`} toast={showToast} />}
            {active === "cli-ai" && <AiTool kind="az-explain" label="CLI.exegete" placeholder="paste any az command..." sample={`az aks create --name prodCluster --resource-group prod-rg --node-count 3 --node-vm-size Standard_DS3_v2 --enable-managed-identity --network-plugin azure --load-balancer-sku standard --enable-cluster-autoscaler --min-count 1 --max-count 10`} toast={showToast} />}
            {active === "err-ai" && <AiTool kind="error-decode" label="ERROR.decryptor" placeholder="paste an Azure error message..." sample={`{\n  "error": {\n    "code": "AuthorizationFailed",\n    "message": "The client 'a1b2...' with object id 'a1b2...' does not have authorization to perform action 'Microsoft.Storage/storageAccounts/listKeys/action' over scope '/subscriptions/.../resourceGroups/prod-rg/providers/Microsoft.Storage/storageAccounts/prodstg' or the scope is invalid."\n  }\n}`} toast={showToast} />}
            {active === "jwt" && <JwtTool toast={showToast} />}
            {active === "base64" && <Base64Tool toast={showToast} />}
            {active === "json-yaml" && <JsonYamlTool toast={showToast} />}
            {active === "json-fmt" && <JsonFmtTool toast={showToast} />}
            {active === "hash" && <HashTool toast={showToast} />}
            {active === "uuid" && <UuidTool toast={showToast} />}
            {active === "timestamp" && <TimestampTool toast={showToast} />}
            {active === "regex" && <RegexTool toast={showToast} />}
            {active === "http" && <HttpTool toast={showToast} />}
            {active === "connstr" && <ConnStrTool toast={showToast} />}
            {active === "url-parse" && <UrlParseTool toast={showToast} />}
            {active === "cron" && <CronTool />}
            {active === "color" && <ColorTool toast={showToast} />}
            {active === "curl" && <CurlTool toast={showToast} />}
            {active === "case" && <CaseTool toast={showToast} />}
            {active === "diff" && <DiffTool />}
            {active === "markdown" && <MarkdownTool />}
            {active === "lorem" && <LoremTool toast={showToast} />}
          </div>
        </main>
      </div>

      <StatusBar active={active} toast={toast} />
      <CmdPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onPick={setActive} />
    </div>
  );
}
