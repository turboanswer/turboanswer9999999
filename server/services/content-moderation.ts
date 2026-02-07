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

export interface ModerationResult {
  isFlagged: boolean;
  type: "clean" | "profanity" | "inappropriate" | "threat";
  matchedWords: string[];
  severity: "none" | "low" | "medium" | "high";
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

  const profanityMatches: string[] = [];
  const words = lowerContent.split(/[\s,.!?;:'"()\[\]{}]+/);
  for (const word of words) {
    if (PROFANITY_LIST.includes(word)) {
      profanityMatches.push(word);
    }
  }

  for (const pattern of INAPPROPRIATE_PATTERNS) {
    const match = lowerContent.match(pattern);
    if (match && !profanityMatches.includes(match[0])) {
      profanityMatches.push(match[0]);
    }
  }

  if (profanityMatches.length > 0) {
    const severity = profanityMatches.length >= 3 ? "high" : profanityMatches.length >= 2 ? "medium" : "low";
    return {
      isFlagged: true,
      type: "profanity",
      matchedWords: profanityMatches,
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
