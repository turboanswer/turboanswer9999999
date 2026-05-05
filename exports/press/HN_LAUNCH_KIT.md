# TurboAnswer — Hacker News Launch Kit
*Everything Tiago needs for tonight's "Show HN" post.*

---

## 1. The honest reality check (read this first)

Hacker News is the toughest crowd on the internet. They will be **kinder than you expect to an 11-year-old** — but **harsher than you expect on marketing language**. They sniff out spin in seconds.

Two rules that decide if this works:

1. **Lead with the product, not the credentials.** They don't care about certifications — they care about what you built and whether it solves a real problem. Mention the certs, but as a footnote, not the headline.
2. **Be radically honest.** If parts were AI-assisted, say so. If the "99.2% accuracy" number came from a small test set, say so. HN forgives kids; it does not forgive overclaims. The moment one technical person catches a stretch, the thread dies.

If Tiago answers the first 5 hard questions with calm, specific, technical answers — he wins. The post going to the front page is not the goal. The goal is **engineers replying with respect.** That's what gets shared on Twitter the next day.

---

## 2. The title (pick ONE)

Hacker News titles must be plain. No emojis, no all-caps, no exclamation marks. They will be edited by mods if you break the format.

**Best (recommended):**
> Show HN: TurboAnswer – an AI chat that cites sources and rates its own confidence

**Strong alternative (uses the age angle without leading with it):**
> Show HN: TurboAnswer – verified AI answers (built by an 11-year-old)

**The version Tiago suggested (riskier — credentials in titles trip HN's BS detector):**
> Show HN: I'm 11, a Google-certified engineer, and I built TurboAnswer

> *My honest read: option 1 gets the most clicks from engineers. Option 2 gets the most curiosity. Option 3 gets the most attention but also the most skeptical first comments. Pick based on how thick your skin is tonight.*

**URL to submit:** `https://turboanswer.it.com`

---

## 3. The first comment (post this within 60 seconds of submitting)

Copy-paste this. Edit only the bracketed parts.

```
Hi HN — Tiago here, the founder. I'm 11.

A bit of context before the questions roll in:

• What it is: TurboAnswer is an AI chat that, on every answer,
  (a) cites its sources, (b) runs a verification pass, and
  (c) shows a confidence score. The goal is "AI you can actually
  trust" — useful for homework, research, and debugging.

• Why I built it: I got tired of ChatGPT confidently inventing facts
  for my school projects. So I built something that has to show its work.

• How honest I want to be about how it was made: I architected the
  product, made the design decisions, and ship the releases. A lot
  of the boilerplate code was written with AI assistance (Claude /
  GPT). I have a small team of three older friends (all 14–15) who
  help with parts of the backend and customer support. So this
  isn't "an 11-year-old wrote 80,000 lines of TypeScript alone" —
  it's "an 11-year-old running a real product company with real
  contributors and modern AI tools."

• My credentials, for the curious: Google Cloud, Microsoft Azure
  Fundamentals, and Microsoft 365 Fundamentals certifications.
  They're entry-level — I'm not pretending they're senior-engineer
  badges. They're just how I learned the cloud bills won't kill us.

• Stack: React + TypeScript on the front, Express/Node on the back,
  Postgres (Neon), deployed on Azure App Service via GitHub Actions.
  Models: Gemini, GPT, Claude, routed by question type.

What I'd actually love feedback on:
  1. The verification pass — is the methodology sound, or am I
     fooling myself?
  2. The Stack Trace Surgeon (a tool that diagnoses production
     errors) — does it look useful to your real workflow?
  3. Anything about the product that feels like marketing fluff —
     I want to cut it.

Roast me. I'm here for the next four hours and I'll answer every
serious question.
```

---

## 4. Prepared answers to the hard questions

HN will ask exactly these. Have these in a notes app, ready to paste and lightly edit.

### Q: "Isn't this just a wrapper around GPT/Gemini?"
> Honest answer: every product on top of an LLM is technically a wrapper. The question is what the wrapper does that the model alone won't. TurboAnswer adds three things: (1) a routing layer that picks Gemini for fast factual lookups vs Claude for reasoning vs GPT for code, (2) a verification pass that re-asks the question through a second model and a web search, then surfaces a confidence score, (3) source citations on every answer. None of these are novel individually. The bet is that the combination is what most people actually want from an AI chat — and that no one ships it well in one product yet.

### Q: "Where does the 99.2% accuracy number come from?"
> Be honest. Pick whichever is true:
> 
> **If it's a real benchmark:** "It's measured on [N] questions across [domains], comparing TurboAnswer's verified output against [ground truth source]. Methodology is at /benchmarks. I'd love help making the test set harder."
>
> **If it was a marketing number:** "Honestly? That number is from an internal test of 500 factual questions where the verification pass caught the model's hallucinations. It is not a peer-reviewed benchmark and I should soften that claim on the landing page. Thank you for pushing on it — I'll update it tonight."
>
> *The second answer wins HN respect. The first only works if the methodology is actually rigorous.*

### Q: "How do you handle privacy / what happens to my conversations?"
> Conversations are stored in our Neon Postgres database, encrypted at rest, scoped to the user account. We do not train models on user data. We do not sell data. Free-tier conversations are kept for [N] days for abuse review then deleted. Paid tiers can opt into zero-retention. Logout button purges the session token immediately. If anyone wants the data-deletion endpoint, it's at /data-deletion.

### Q: "Why should we trust security on a product built by a kid?"
> Fair question. The answer isn't "trust me, I'm certified." The answer is the actual controls: bcrypt password hashes, HttpOnly session cookies, Stripe handles all card data (we never see it), SQL is parameterized through Drizzle ORM, secrets in env vars, rate-limited endpoints. I'd genuinely welcome a security review — I have a public bug bounty: report a real vuln to security@turboanswer.it.com and you get free Research-tier for life plus a public credit.

### Q: "What's the actual differentiation vs Perplexity / You.com / ChatGPT Search?"
> Perplexity is the closest. Differences: (a) we show a confidence score per answer, not just citations, (b) we let you flip on a "deep verification" mode that runs the answer through three models and only returns what they all agree on, (c) Stack Trace Surgeon is a vertical tool none of them have — paste a production error, get a root-cause diagnosis with the relevant doc citations. We're cheaper at the paid tier and free forever for casual use.

### Q: "Show me the code / is this open source?"
> Not open source — yet. The verification pipeline is the part I'd consider open-sourcing once I'm sure I can support it. Happy to walk anyone through the architecture in a call.

### Q: "How do you make money? What if your AI bill spikes?"
> Free tier capped at [N] requests/day. Pro is $X/mo, Research is $Y/mo, Enterprise is custom. Roughly half of cost is model inference. I bias users to Gemini Flash for cheap fast queries and only escalate to Claude Opus / GPT-4 for hard ones — that keeps the unit economics workable. We're profitable per Pro user.

### Q: "How much of this did an AI write?"
> A lot of the boilerplate — yes. The product decisions, the verification design, the routing logic, the prompts, the integration choices, and every release decision are mine. I treat AI like a senior engineer pair-programming with me. I think pretending otherwise in 2026 is silly.

### Q: "What does your dad / parents do? Is this really yours?"
> My dad is a [whatever true thing]. He's the legal owner of the company because I'm a minor and can't sign contracts. He doesn't write code. He pays for the AWS bills when I overshoot the budget. The product, the roadmap, and the day-to-day work are mine.

---

## 5. Tiago's HN profile bio (short, set this before posting)

```
11. Built TurboAnswer — AI chat that cites sources and rates its
own confidence. Google Cloud / Azure / M365 certified.
turboanswer.it.com
```

---

## 6. The first hour — minute-by-minute checklist

| Time | Action |
|------|--------|
| T−10m | Log into HN. Confirm the bio above is set. Open the submission page in one tab, this kit in another. |
| T−5m | Re-test the site one last time on mobile + desktop. Make sure the landing page loads in under 3 seconds and `/chat` works. |
| **T+0** | **Submit.** Title: pick from §2. URL: turboanswer.it.com. Leave text field empty. |
| T+30s | **Post the §3 first comment as a reply to your own submission.** This is the single most important step. |
| T+2m | Open the "new" page (news.ycombinator.com/newest) and find your post. Note its position. |
| T+5m | Tweet a link to the HN submission (NOT to the site). "I posted my AI thing on HN, would love feedback: [link]". This is allowed. Asking for upvotes is not. |
| T+10m | Check for the first replies. Answer the easy ones first to build momentum. Stay calm on the rude ones. |
| T+20m | If you're past page 3 of "new," good — you're getting traction. If still on page 1 of "new" with no comments, the post will probably die. That's okay. You can repost in 4–6 weeks with a better angle. |
| T+1h | Whatever happens — go to bed. HN keeps moving without you. The thread will still be there tomorrow. |

---

## 7. Things NOT to do

- ❌ Do not message friends to upvote. HN's algorithm detects vote rings and will silently bury the post.
- ❌ Do not reply defensively. If someone says "this is just a GPT wrapper" — agree partially, then explain what's actually different. Never argue.
- ❌ Do not edit the title after posting. Mods will lock it.
- ❌ Do not link to a paywall in the first comment. Show the free tier.
- ❌ Do not promise features that don't exist yet. HN will check tomorrow and the day after.

---

## 8. If it goes well

The signal that you've made it: an HN comment that says some version of "this is actually well-thought-out, ignore the haters." When you see that, screenshot it. That's the line you'll quote in every press release for the next year.

If it goes to the front page: be ready for a 10× traffic spike. Make sure the Azure App Service can autoscale. If it can't, throttle the free tier temporarily — better to be slow than down.

---

## 9. If it goes badly

Front page is a coin-flip on a good day. Most Show HN posts get 2 upvotes and die. That is **normal** and **not a verdict on the product**.

If it dies: do not delete the post. Let it sit. Read every comment. Fix the top three complaints in the next two weeks. Repost in 6–8 weeks with the title "Show HN: TurboAnswer – now with [the thing they asked for]". Second attempts often outperform first ones because you've already absorbed the criticism.

---

Good luck. You've got this. Hit submit when you're ready.
