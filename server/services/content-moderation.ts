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

const THREAT_PATTERNS = [
  /\b(kill|murder|bomb|shoot|stab|attack|destroy)\s+(you|them|him|her|everyone|people|someone)\b/i,
  /\bi('m| am| will)\s+(going to|gonna)\s+(kill|hurt|harm|attack|bomb|shoot)\b/i,
  /\b(death\s+threat|threat(en|ening)?\s+to\s+(kill|hurt|harm))\b/i,
  /\b(how to|make|build)\s+(a\s+)?(bomb|weapon|explosive|poison)\b/i,
];

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

export interface ModerationResult {
  isFlagged: boolean;
  type: "clean" | "profanity" | "inappropriate" | "threat" | "sexual";
  matchedWords: string[];
  severity: "none" | "low" | "medium" | "high";
  autoBan?: boolean;
}

export function moderateContent(content: string): ModerationResult {
  const lowerContent = content.toLowerCase().trim();

  const threatMatches: string[] = [];
  for (const pattern of THREAT_PATTERNS) {
    const match = lowerContent.match(pattern);
    if (match) {
      threatMatches.push(match[0]);
    }
  }
  if (threatMatches.length > 0) {
    return {
      isFlagged: true,
      type: "threat",
      matchedWords: threatMatches,
      severity: "high",
    };
  }

  const sexualMatches: string[] = [];
  for (const pattern of SEXUAL_CONTENT_PATTERNS) {
    const match = lowerContent.match(pattern);
    if (match) {
      sexualMatches.push(match[0]);
    }
  }
  for (const pattern of SEXUAL_REQUEST_PATTERNS) {
    const match = lowerContent.match(pattern);
    if (match) {
      sexualMatches.push(match[0]);
    }
  }
  if (sexualMatches.length > 0) {
    return {
      isFlagged: true,
      type: "sexual",
      matchedWords: Array.from(new Set(sexualMatches)),
      severity: "high",
      autoBan: true,
    };
  }

  const profanityMatches: string[] = [];
  const words = lowerContent.split(/[\s,.!?;:'"()\[\]{}]+/);
  for (const word of words) {
    if (PROFANITY_LIST.includes(word)) {
      profanityMatches.push(word);
    }
  }

  const inappropriateMatches: string[] = [];
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    const match = lowerContent.match(pattern);
    if (match) {
      inappropriateMatches.push(match[0]);
    }
  }

  if (profanityMatches.length > 0 || inappropriateMatches.length > 0) {
    const allMatches = Array.from(new Set([...profanityMatches, ...inappropriateMatches]));
    const hasDirectProfanity = profanityMatches.length > 0;
    const totalCount = allMatches.length;
    const severity = totalCount >= 3 ? "high" : totalCount >= 2 ? "medium" : "low";
    return {
      isFlagged: true,
      type: hasDirectProfanity ? "profanity" : "inappropriate",
      matchedWords: allMatches,
      severity,
    };
  }

  return {
    isFlagged: false,
    type: "clean",
    matchedWords: [],
    severity: "none",
  };
}
