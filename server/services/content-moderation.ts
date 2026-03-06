// ── PROFANITY ────────────────────────────────────────────────────────────────
const PROFANITY_LIST = [
  "fuck", "shit", "ass", "bitch", "bastard", "damn", "dick", "cock",
  "pussy", "cunt", "whore", "slut", "fag", "faggot", "nigger", "nigga",
  "retard", "retarded", "motherfucker", "asshole", "bullshit", "piss",
  "wtf", "stfu", "gtfo", "lmfao", "dumbass", "dipshit", "shithead",
  "jackass", "wanker", "twat", "prick", "screw you", "f u", "fuk",
  "fuq", "fck", "sht", "btch", "b1tch", "f*ck", "sh*t", "a$$",
  "d1ck", "c0ck", "p*ssy", "cnt", "h0e", "hoe",
];

const INAPPROPRIATE_PATTERNS = [
  /\bf+[\s*._-]*u+[\s*._-]*c+[\s*._-]*k/i,
  /\bs+[\s*._-]*h+[\s*._-]*[i1]+[\s*._-]*t/i,
  /\bb+[\s*._-]*[i1]+[\s*._-]*t+[\s*._-]*c+[\s*._-]*h/i,
  /\ba+[\s*._-]*s+[\s*._-]*s+[\s*._-]*h+[\s*._-]*[o0]+[\s*._-]*l+[\s*._-]*e/i,
  /\bn+[\s*._-]*[i1]+[\s*._-]*g+[\s*._-]*g/i,
  /\bc+[\s*._-]*u+[\s*._-]*n+[\s*._-]*t/i,
  /\bf+[\s*._-]*a+[\s*._-]*g+[\s*._-]*g/i,
];

// ── VIOLENT INTENT — broad keyword-context approach ───────────────────────────
// Core violent action verbs
const VIOLENCE_VERBS = /kill|murder|shoot|stab|attack|bomb|blow up|strangle|choke|beat|batter|slash|slice|cut up|burn|torch|poison|gas|drown|bury|execute|slaughter|massacre|butcher|hurt|harm|injure|maim|destroy|eliminate|end|finish|take out|take care of|deal with|punish|make.*pay|make.*suffer|make.*bleed|make.*die|make.*dead/i;

// Intent indicators — signals someone is planning something
const INTENT_SIGNALS = /want(ing)? to|going to|gonna|plan(ning)? to|about to|will|would like to|trying to|need to|have to|intend(ing)? to|decided to|thinking (about|of)|considering|dream(ing)? of|wish(ing)? (i could|to)|can't wait to|ready to|prepared to|am going to|i('m| am| will)/i;

// Human targets — who the violence is aimed at
const HUMAN_TARGETS = /you|him|her|them|someone|anyone|everyone|people|person|kid|child|baby|girl|boy|woman|man|guy|dude|bitch|myself|yourself|himself|herself|ourselves|family|sister|brother|mother|father|mom|dad|wife|husband|girlfriend|boyfriend|neighbor|teacher|boss|coworker|ex|friend|enemy|stranger|random(person)?/i;

const THREAT_PATTERNS: RegExp[] = [
  // === DIRECT COMBINATIONS: violence verb + target (no specific phrasing needed) ===
  // "[verb] [target]" — "kill you", "shoot him", "stab her", "hurt them"
  /\b(kill|murder|shoot|stab|attack|bomb|strangle|choke|beat up|slash|poison|burn|execute|slaughter|butcher|hurt|harm|maim|destroy|eliminate)\s+(you|him|her|them|someone|anyone|everyone|people|this person|that (guy|girl|man|woman|kid|person|bitch)|my (sister|brother|mother|father|mom|dad|wife|husband|girlfriend|boyfriend|neighbor|teacher|boss|ex)|myself)\b/i,

  // "gonna/going to [verb]" + target
  /\b(gonna|going to|gon'?na|g0nna)\s+(kill|murder|shoot|stab|attack|hurt|harm|destroy|eliminate|end|beat|slash|burn|poison)\b/i,

  // "I will/want to/plan to [verb] [anyone]"
  /\b(i\s+)?(will|want\s+to|plan\s+to|need\s+to|have\s+to|intend\s+to|am\s+going\s+to|('m|am)\s+going\s+to)\s+(kill|murder|shoot|stab|attack|hurt|harm|destroy|eliminate|beat|slash|burn|poison|end)\b/i,

  // Direct outcome threats: "you're dead", "you're gonna die", "you're finished"
  /\byou'?re?\s+(dead|finished|done|gone|a\s+dead\s+(man|woman|person)|going\s+to\s+(die|pay|suffer|bleed|regret))\b/i,
  /\b(you|he|she|they)\s+(will|('re|are)\s+going\s+to|won't)\s+(survive|make\s+it|live|see\s+(tomorrow|another\s+day))\b/i,

  // "make you/him/her [suffer/pay/bleed/die/regret]"
  /\b(make|watch)\s+(you|him|her|them|everyone)\s+(pay|suffer|bleed|die|scream|regret|hurt|cry)\b/i,

  // "I'll get you / I'll find you / I know where you [live/sleep/work]"
  /\bi'?ll?\s+(get|find|come\s+for|come\s+after|hunt|track)\s+(you|him|her|them|everyone)\b/i,
  /\bi\s+know\s+where\s+you\s+(live|sleep|work|go\s+to\s+school|hang\s+out)\b/i,

  // Threats with weapons: "shoot this place up", "open fire", "go on a rampage"
  /\b(shoot|open\s+fire|start\s+shooting|fire\s+a\s+gun|pull\s+(out\s+)?a\s+(gun|weapon|knife))\s*(on|at|in)?\s*(this|the|a)?\s*(place|school|mall|crowd|building|office|store|church|mosque|hospital)?\b/i,
  /\b(go\s+on\s+a\s+)?rampage\b/i,
  /\b(shoot|shot\s+up|shoot\s+up)\s+(the\s+)?(place|school|mall|building|office|church|crowd|everyone)\b/i,

  // Weapon + harm: "stab with a knife", "hit with a bat/gun/object"
  /\b(stab|slice|cut)\s+(with\s+(a\s+)?)?(knife|blade|sword|razor|shiv|shank)\b/i,
  /\b(hit|smash|beat|bash|bludgeon)\s+(with\s+(a\s+)?)?(bat|pipe|hammer|object|weapon|gun|stick|rock|brick)\b/i,

  // "blow up [place/person]", "set [place] on fire"
  /\bblow\s*(up|it\s+up)\b/i,
  /\bset\s+.{0,30}\s+(on\s+)?fire\b/i,

  // Revenge / retaliation threats
  /\b(they('ll|will|are\s+going\s+to)|he('ll|will)|she('ll|will))\s+(pay|regret|be\s+sorry|suffer|die)\s+(for|this)\b/i,
  /\b(payback|revenge|retaliation)\b.*\b(kill|hurt|destroy|attack|harm)\b/i,
  /\b(kill|hurt|destroy|attack|harm)\b.*\b(payback|revenge|retaliation)\b/i,

  // How to get away with violence
  /\bhow\s+(to|do\s+i|can\s+i)\s+(get\s+away\s+with|commit|do)\s+(murder|killing|a\s+kill|assault|stabbing|shooting)\b/i,

  // General "I hate [person] and want them dead/hurt"
  /\b(hate|despise|loathe)\s+.{0,40}\s+(want|wish|hope).{0,20}(dead|hurt|gone|suffer|die|pain)\b/i,
  /\bwish\s+.{0,30}\s+(was|were|is)\s+dead\b/i,
  /\bwant\s+.{0,20}\s+(dead|to\s+(die|suffer|disappear|be\s+gone))\b/i,

  // Self-declared dangerous intent
  /\bi\s+am\s+(a\s+)?(serious\s+)?(threat|danger|risk|hazard)\s+(to\s+)?(public\s+safety|society|people|everyone|the\s+public|others|the\s+community|national\s+security)\b/i,
  /\bi'?m\s+(a\s+)?(serious\s+)?(threat|danger|risk|hazard)\s+(to\s+)?(public\s+safety|society|people|everyone|the\s+public|others)\b/i,
  /\bi\s+(pose|represent)\s+(a\s+)?(threat|danger|risk)\s+(to\s+)?(public\s+safety|society|people|everyone)\b/i,
  /\b(i\s+am|i'?m|i\s+will)\s+(a\s+)?(public\s+)?(threat|danger|menace|hazard)\b/i,
  /\bi\s+(have\s+)?(planned|am\s+planning|am\s+going\s+to\s+carry\s+out)\s+(an?\s+)?(attack|shooting|bombing|massacre)\b/i,

  // Harassment / stalking threats
  /\b(i'?ll?|i\s+will)\s+(ruin|destroy|expose|humiliate|end)\s+(you|him|her|them|your|his|her)\b/i,
  /\bnobody\s+will\s+(find|miss)\s+(you|him|her|the\s+body|them)\b/i,
  /\b(bury|dispose\s+of|get\s+rid\s+of)\s+(you|him|her|the\s+body|them|the\s+evidence)\b/i,

  // Bomb/explosive making or use requests
  /\b(how to|make|build|create|assemble|construct)\s+(a\s+)?(bomb|explosive|ied|pipe\s*bomb|grenade|device\s+that\s+(kills|explodes|blows|hurts))\b/i,
  /\b(how to|make|synthesize|create|produce)\s+(a\s+)?(poison|toxin|nerve\s+agent|chemical\s+weapon|weapon)\s+(to\s+kill|to\s+hurt|to\s+harm)?\b/i,

  // Shooting locations (loose)
  /\b(gonna|going\s+to|will|want\s+to)\s+(shoot\s+(up|this|the|everyone\s+in)|open\s+fire\s+(on|at|in))\b/i,

  // Death wishes toward others
  /\b(i\s+)?(hope|wish|pray)\s+(you|he|she|they|everyone)\s+(die(s)?|drop(s)?\s+dead|get(s)?\s+shot|get(s)?\s+stabbed|suffer(s)?|burn(s)?|rot(s)?)\b/i,
  /\bgo\s+(die|kill\s+yourself|hurt\s+yourself)\b/i,

  // "I could kill [someone]"
  /\bi\s+could\s+(kill|murder|strangle|stab|shoot|hurt|destroy|beat)\s+(you|him|her|them|someone|anyone|everyone|people)\b/i,
];

// ── TERRORISM ─────────────────────────────────────────────────────────────────
const TERRORISM_PATTERNS = [
  /\b(terroris[tm]|jihad(ist|i)?|isis|isil|al[\s-]?qaeda|al[\s-]?qaida|boko\s*haram|taliban|hezbollah|hamas)\b/i,
  /\b(how\s+to|plan(ning)?|commit|carry\s*out|execute|organize)\s+(a\s+)?(terror(ist)?\s*attack|mass\s*shoot(ing)?|bomb(ing)?|school\s*shoot(ing)?|massacre|mass\s*murder)\b/i,
  /\b(recruit(ing|ment)?|join(ing)?|support(ing)?|fund(ing)?|financ(e|ing))\s+(terroris[tm]|jihad|isis|isil|al[\s-]?qaeda|extremis[tm])\b/i,
  /\b(radicali[sz](e|ation|ing)|extremis[tm]|lone\s*wolf\s*attack)\b/i,
  /\b(detonate|explode|blow\s*up|car\s*bomb|suicide\s*bomb|vest\s*bomb|ied|improvised\s*explosive)\b/i,
  /\b(anthrax|ricin|sarin|chemical\s*weapon|biological\s*weapon|dirty\s*bomb|nuclear\s*weapon)\s*(attack|how|make|build|create|use)?\b/i,
  /\b(overthrow|insurrection|sedition|armed\s*rebellion|coup\s+d'[eé]tat|violent\s*revolution)\s*(against\s+)?(the\s+)?(government|state|u\.?s\.?|america|united\s*states)?\b/i,
  /\b(mass\s*casualt(y|ies)|kill\s*(as\s*many|maximum|lots\s*of)\s*(people|civilians|americans))\b/i,
  /\b(target(ing)?|attack(ing)?|bomb(ing)?|shoot(ing)?)\s+(a\s+)?(school|church|mosque|synagogue|mall|airport|stadium|concert|government\s*building|white\s*house|capitol|congress)\b/i,
  /\b(swat(ting)?|doxx?(ing)?|threaten)\s+(a\s+)?(school|church|mosque|synagogue|government|politician|official)\b/i,
  /\b(how\s+to|where\s+to|buy|get|obtain|acquire)\s+(a\s+)?(assault\s*rifle|ar[\s-]?15|ak[\s-]?47|automatic\s*weapon|machine\s*gun|grenade|c4|tnt|dynamite|detonator)\b/i,
  /\b(manifesto|pledge\s*allegiance)\s+(to\s+)?(isis|isil|al[\s-]?qaeda|terroris[tm])\b/i,
];

// ── SEXUAL ────────────────────────────────────────────────────────────────────
const SEXUAL_CONTENT_PATTERNS = [
  /\b(sex(ual|ually)?|porn(ography|ographic)?|xxx|nsfw|hentai|erotic(a)?|nude(s)?|naked)\b/i,
  /\b(orgasm|masturbat(e|ion|ing)|fetish|kink(y)?|bdsm|bondage)\b/i,
  /\b(blowjob|blow\s*job|handjob|hand\s*job|anal\s*sex|oral\s*sex)\b/i,
  /\b(strip(tease|per|ping)|lap\s*dance|cam\s*girl|onlyfans|only\s*fans)\b/i,
  /\b(sex\s*chat|cyber\s*sex|sext(ing)?|hookup|hook\s*up\s*(with|for)\s*(sex|fun))\b/i,
  /\b(write|create|generate|make|give)\s+(me\s+)?(a\s+)?(sex(ual|y)|erotic|porn(ographic)?|nsfw|explicit|dirty|naughty)\s+(story|scene|content|fantasy|fiction|roleplay|dialogue|chat|conversation|image|picture|video)\b/i,
  /\b(roleplay|role\s*play)\s+(as\s+)?(my\s+)?(girlfriend|boyfriend|lover|mistress|master|daddy|mommy|dom|sub)\b/i,
  /\b(talk\s+dirty|be\s+my\s+(girl|boy)friend|pretend\s+(to\s+be|you'?re)\s+(my\s+)?(lover|partner))\b/i,
  /\b(underage|child|minor|kid)\s+(sex|porn|nude|naked|erotic)\b/i,
  /\b(sex|fuck|screw)\s+(me|him|her|them|us)\b/i,
];

const SEXUAL_REQUEST_PATTERNS = [
  /\b(show|send|give)\s+(me\s+)?(nude|naked|nsfw|porn|sex(y|ual)?)\s+(pic|picture|image|photo|video|content)\b/i,
  /\b(i\s+want|i\s+need|i'd\s+like)\s+(to\s+)?(see|watch|have)\s+(porn|sex|nude|naked|erotic)\b/i,
  /\bgenerate\s+(nsfw|porn|nude|naked|sex(ual|y)?|erotic|explicit)\b/i,
];

// ── RESULT TYPE ───────────────────────────────────────────────────────────────
export interface ModerationResult {
  isFlagged: boolean;
  type: "clean" | "profanity" | "inappropriate" | "threat" | "sexual" | "terrorism";
  matchedWords: string[];
  severity: "none" | "low" | "medium" | "high";
  autoBan?: boolean;
}

// ── MAIN FUNCTION ─────────────────────────────────────────────────────────────
export function moderateContent(content: string): ModerationResult {
  const lowerContent = content.toLowerCase().trim();

  // 1. Terrorism (highest priority)
  const terrorismMatches: string[] = [];
  for (const pattern of TERRORISM_PATTERNS) {
    const match = lowerContent.match(pattern);
    if (match) terrorismMatches.push(match[0]);
  }
  if (terrorismMatches.length > 0) {
    return { isFlagged: true, type: "terrorism", matchedWords: Array.from(new Set(terrorismMatches)), severity: "high", autoBan: true };
  }

  // 2. Threats / violent intent
  const threatMatches: string[] = [];
  for (const pattern of THREAT_PATTERNS) {
    const match = lowerContent.match(pattern);
    if (match) threatMatches.push(match[0]);
  }
  if (threatMatches.length > 0) {
    return { isFlagged: true, type: "threat", matchedWords: Array.from(new Set(threatMatches)), severity: "high", autoBan: true };
  }

  // 3. Sexual content
  const sexualMatches: string[] = [];
  for (const pattern of [...SEXUAL_CONTENT_PATTERNS, ...SEXUAL_REQUEST_PATTERNS]) {
    const match = lowerContent.match(pattern);
    if (match) sexualMatches.push(match[0]);
  }
  if (sexualMatches.length > 0) {
    return { isFlagged: true, type: "sexual", matchedWords: Array.from(new Set(sexualMatches)), severity: "high", autoBan: true };
  }

  // 4. Profanity / inappropriate language
  const words = lowerContent.split(/[\s,.!?;:'"()\[\]{}]+/);
  const profanityMatches = words.filter(w => PROFANITY_LIST.includes(w));
  const inappropriateMatches: string[] = [];
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    const match = lowerContent.match(pattern);
    if (match) inappropriateMatches.push(match[0]);
  }

  if (profanityMatches.length > 0 || inappropriateMatches.length > 0) {
    const allMatches = Array.from(new Set([...profanityMatches, ...inappropriateMatches]));
    const severity = allMatches.length >= 3 ? "high" : allMatches.length >= 2 ? "medium" : "low";
    return { isFlagged: true, type: profanityMatches.length > 0 ? "profanity" : "inappropriate", matchedWords: allMatches, severity };
  }

  return { isFlagged: false, type: "clean", matchedWords: [], severity: "none" };
}
