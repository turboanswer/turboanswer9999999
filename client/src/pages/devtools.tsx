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
  | "json-fmt" | "diff" | "lorem" | "markdown" | "url-parse" | "case";

type Category = { name: string; tools: { id: ToolId; label: string; icon: string; desc: string }[] };

const CATEGORIES: Category[] = [
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
