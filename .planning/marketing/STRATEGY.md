# Career OS — Go-to-Market Strategy

> First version, 2026-05. Solo founder, pre-launch, FR + US dual market. The plan is opinionated on purpose — vague strategies don't ship.

---

## 0. The strategic call before anything else

Career OS has **two narratives** competing for the brand. Pick one as primary, the other as edge.

| Narrative | Hook | TAM | Brand risk | Defensibility |
|---|---|---|---|---|
| **A. "Cheat your interview"** | Stealth Live Copilot during a video call | Massive (US especially) | High — bans, takedowns, reputation, recruiter blacklists | Low — first OpenAI/Cluely-style copycat eats lunch |
| **B. "Career operating system"** | Track + tailor + prep + close, with a private AI coach | Large but slower | Low — sounds like a productivity tool | High — workflow lock-in, data moat (your CVs, your apps, your prep history) |

**The recommendation is B as primary, A as differentiator.**

Reasoning:
- A goes viral fast on TikTok but the brand becomes "the cheating app". Recruiters of the firms you're targeting will blacklist users they catch. Apple may pull the build over notarisation flags. The story becomes about you, not about the user.
- B compounds. Every CV uploaded, every application tracked, every prep session is data the user doesn't want to lose. That's retention. That's pricing power.
- The Live Copilot is **the magic moment that converts B users**. You don't lead with it — you reveal it once a user is invested. Same playbook as Notion AI, Linear AI, Superhuman's killer features.

**Tagline ladder** (pick one to A/B):
- **Primary:** *"The career operating system for people targeting top firms."* (matches existing README, stable, professional)
- **Aggressive:** *"Job hunting is a process problem. Career OS is the process."*
- **Punchy:** *"Stop juggling tabs. Start landing offers."*
- **Founder-voice for TikTok:** *"I built a Mac app that runs my entire job hunt. Here's day 1."*

**Tone:** confident, technical, candid. Never overclaim. Never use the word "revolutionary". Avoid "AI-powered" — say what it does instead.

---

## 1. ICP — Ideal Customer Profile

### Primary persona — "Mathilde, the ambitious last-year"

| | |
|---|---|
| **Age** | 22-25 |
| **School** | HEC, ESCP, Polytechnique, Mines, Centrale, ESSEC, EM Lyon (FR) / Wharton, Stanford GSB, Booth, Sloan (US) |
| **Stage** | M2 / Senior year / first 24 months out |
| **Targeting** | MBB, GS/JPM/MS, Anthropic/OpenAI/Stripe, top PE / VC, top tech PM |
| **Active applications** | 4-12 |
| **Mac owner?** | Yes (top-school cohort is ~70% MBP) |
| **Daily prep / apply time** | 2-4h |
| **Pain** | "I have 12 tabs open. Notion, LinkedIn, ChatGPT, Calendar, Gmail, Greenhouse, Lever, my school's career center, Slack with my prep group, Claude, my CV in Pages. I lose 30 min a day to context-switching." |
| **Currently uses** | Notion + LinkedIn Premium + ChatGPT + a school career center portal (JobTeaser) + an Excel tracker someone shared on WhatsApp |
| **WTP** | €15-25/mo (refs: Notion AI €10, LinkedIn Premium €30, Teal HQ $30, prep classes €500-2000) |
| **Discovery** | TikTok career creators (FR: @lasylosophe, @anais_business, anglophone Big4 / consulting / Wall St creators), Instagram alumni accounts, WhatsApp group of school cohort, podcasts (Wagon, Génération Do It Yourself for FR; My First Million / Acquired for US) |
| **Decision triggers** | Has a high-stakes interview coming up in <14 days. A friend at the same school says "this thing helped me land my Bain offer." A school alumni Slack thread mentions it. |

### Secondary persona — "James, mid-cycle US job seeker"

| | |
|---|---|
| **Age** | 25-32 |
| **Context** | Recently laid off from a unicorn / big tech, or Y3-Y5 looking to switch up |
| **Active applications** | 30-100/month |
| **Pain** | ATS noise — everyone now uses ChatGPT to tailor, so the signal-to-noise of a tailored CV has collapsed. Interview burnout from 6th-round loops. |
| **WTP** | $20-50/mo |
| **Discovery** | TikTok #LayoffTok, Reddit r/cscareerquestions / r/ExperiencedDevs, Twitter, podcasts |

### Tertiary persona — "The career switcher"

| | |
|---|---|
| **Age** | 27-34 |
| **Context** | Finance → tech, consulting → product, IB → startup founder hiring |
| **Pain** | Translating experience, learning new vocab, looking credible in a domain where their CV doesn't naturally fit |
| **WTP** | High — career change is high-stakes, willing to spend |

### Anti-ICP — who we politely do NOT sell to (yet)

- **Volume applicants for entry-level retail / hospitality / blue-collar.** They don't have a Mac, don't pay €20/mo for tooling, and the ATS-tailoring layer doesn't matter at their level.
- **Senior executives (VP+).** They get jobs through networks, not pipelines. Wrong product.
- **Anyone applying to <3 companies.** Workflow lock-in needs volume to compound.
- **Anyone who'd actually read this and say "I'd never use AI in my job hunt".** Out of frame.

### ICP scoring rubric (for content + ad targeting)

A piece of content or an audience segment is on-ICP if it scores **≥ 7/10**:

```
Top-school student / alum     ×3
Targets prestige firms        ×2
Mac user                      ×1
Active applicant (>3)         ×2
EN or FR speaker              ×1
Has a video interview <14d    ×1
```

---

## 2. The North Star

**Activated week-1 user count.** Not signups. An "activated week-1 user" is someone who:
1. Installed the app
2. Uploaded ≥1 CV
3. Has ≥1 application tracked
4. Opened the Copilot at least once

Why this metric: it's the leading indicator of paid conversion 4-8 weeks later. Vanity metrics (followers, signups) lie. This one doesn't.

**Anti-metrics — explicitly NOT chasing:**
- Follower count
- Vanity TT views (a 1M-view "cheat your interview" video drives the wrong audience)
- Press mentions in tech news outlets (no signal for ICP)

---

## 3. TikTok strategy

### Why TikTok primary

- ICP is on it 1-2h/day in 2026
- French career TT is **smaller and less saturated** than US — opportunity window
- Algo favors hook density + watch time over follower count, so a brand-new account can hit 100k+ on video #3 if the hook lands
- It's where "I built this thing" + "here's how I use it" plays best

### Account structure — TWO accounts, deliberate roles

**`@careeros`** (or `@career.os` if taken) — **product account**
- Polished demos, testimonials, feature reveals
- Reposts of user wins ("Marie just landed Bain, here's how she used Career OS")
- Posting cadence: 3/week
- Tone: clean, design-led, screenshots + screen recordings

**`@gabranpro`** (or whatever founder handle) — **founder account**
- Building in public, "day 87 of building a job-hunt app"
- Strong opinions on the job market, AI, top firms
- Behind-the-scenes
- Posting cadence: 4-5/week
- Tone: opinionated, candid, technical occasionally

The founder account does **most of the discovery work** in 2026. Personal brand > product brand for early-stage. Mr. Beast principle: people follow people, not logos. The product account is for credibility once they Google.

### Content pillars (5)

| Pillar | % of feed | Format | Example hooks |
|---|---|---|---|
| **1. The build** | 25% | Screen recording + voiceover, 30-60s | "I'm building a Mac app for HEC seniors. Day 87." / "I just rewrote 1430 lines of Rust because the audit said so." |
| **2. The product reveal** | 20% | Polished demo, captions, 15-30s | "POV: you're 5 min before a McKinsey final round and you open this." / "The 3 things every CV is missing." |
| **3. Job market truths** | 25% | Talking head + b-roll, 45-90s | "Why 'tailor your CV' is now noise — and what replaced it." / "Le secret pour passer les ATS en 2026." / "I analyzed 500 McKinsey interview questions. Here are the 4 patterns." |
| **4. User wins** | 15% | UGC reposts, before/after | "Marie went from 0 callbacks to 4 final-rounds in 6 weeks." |
| **5. Hot takes** | 15% | Strong opinion, response to other creators | Stitch a "career advice" creator and disagree with data. "@lasylosophe said X. Here's what the data actually shows." |

### Hook library — the 1.5s rule

Every video needs a sub-1.5s hook. These ALL pass:

- "Si tu postules à McKinsey, ferme cette app maintenant."
- "I built a Mac app that interviewed me for 4 hours so you don't have to."
- "Reasons your CV got rejected in 2026 (it's not what you think)."
- "POV: 9:58 AM. Final round at 10:00. You open Career OS."
- "L'erreur que 90% des étudiants HEC font dans leur lettre de motivation."
- "Recruiters at MBB read your CV for 6 seconds. Here's the heatmap."
- "I asked 50 ex-McKinsey their #1 prep tip. They all said this."
- "Why ChatGPT-tailored CVs stopped working last year."
- "Three jobs you should NEVER apply to via LinkedIn."

### Posting cadence — first 90 days

- **Week 1-2:** Setup. 5 videos posted to seed the algo. Don't expect traction.
- **Week 3-6:** 4 videos/week (founder) + 3/week (product) = 7/week total. **No editing perfectionism. Ship.**
- **Week 7-12:** Down to 5/week total IF a winning format emerges. Up to 10/week if traction is flat (probably broken format, not reach).

### Metrics that matter

| Metric | Target by D90 |
|---|---|
| Avg watch time | >50% of video length |
| Like ratio | >5% (likes / views) |
| Save ratio | >1% (saves / views) — **the single best signal for career content** |
| Bio link CTR | >2% |
| Waitlist conversion from bio click | >20% |
| **Activated week-1 users from TT in M3** | **≥150** |

### What NOT to do on TikTok

- Don't show the Live Copilot during an actual interview. Even a fake one. The clip will be screenshot, taken out of context, and become "Career OS = cheating tool". You lose B2B school partnerships forever.
- Don't dance, don't lip-sync, don't do trends that don't fit the brand.
- Don't post cringe "founder grindset" content. The ICP is sophisticated and will mock it.
- Don't gate good advice behind "follow for part 2" too aggressively. Build trust first.

---

## 4. Instagram strategy

Instagram is **secondary, repurposed, with one native format**.

### Three surfaces, three jobs

| Surface | Job | Source |
|---|---|---|
| **Reels** | Reach + funnel | 100% repurposed from TikTok with vertical re-export. Strip TT watermark (`snaptik` or paid SaaS) — IG penalizes watermarked uploads. |
| **Stories** | Building in public + 1:1 conversion | Native, daily. 2-4 stories/day. |
| **Feed (static + carousel)** | Trust building when someone Googles you | 1-2 posts/week, mostly carousels with real data ("8 stats from 500 McKinsey applications") and product shots. |

### Stories — the underrated channel

Stories convert at 3-5× Reels for high-WTP products like Career OS. Why: they're seen by people who already follow you (warmer audience), and the swipe-up / link sticker is friction-free.

Daily stories template:
- Morning: "Today I'm working on X" (commitment device)
- Midday: poll / question to ICP ("How many applications are you tracking?")
- End of day: progress shot ("Shipped this, here's the diff")
- Bonus 1-2x/week: a reply-to-DM screenshot showing real user wins (with permission)

### Carousels — the format Reels can't replicate

Carousels are saved 8-12× more than single images for B2B-ish content. Career OS perfect topics:

- **"7 things I'd do differently if I was applying to McKinsey today (slide 7 is the killer)"**
- **"Vrai vs faux dans la prep d'entretien — décortiqué par un ex-McKinsey"**
- **"The CV section every HEC student forgets (and recruiters notice)"**
- **"5 questions you should ask your interviewer at every round"**

Carousel CTA always: "Save this for your next interview" → save = algo boost + retention.

### What NOT to do on Instagram

- Don't post-and-ghost. IG punishes inconsistent accounts harder than TT.
- Don't run paid ads in M1-M3. Burn cash without product-market fit signal.
- Don't cross-post 1:1 with TikTok captions. Re-write the caption for IG (longer, hashtag-heavy, more emoji).

---

## 5. The acquisition funnel

```
TikTok / IG Reel (hook + value)
    ↓ (bio link CTR ~2%)
Landing page — careeros.app
    ↓ (waitlist conversion ~25%)
Waitlist email — Loom video from founder, 60s
    ↓ (DMG download ~40%)
DMG installed
    ↓ (CV upload ~50% of installs)
ACTIVATED WEEK-1 USER
    ↓ (paid conversion 8-15% over 60 days)
PAID
```

### Landing page — the only thing that needs to be perfect

The landing must do exactly four things in this order:

1. **Hero.** "The career operating system for people targeting top firms." + 12-second auto-playing screen recording of the dashboard. NOT a hero illustration. NOT a long video.
2. **Social proof.** "Built by Gabriel, ex-[your last name credentials]. Used by N students at HEC, Stanford, Wharton." (Inflate honestly — N=8 friends counts.) Logos of schools.
3. **The 3 features that matter.** Apply tracker, ATS analyzer, Live Copilot. Each one a 6-second loop.
4. **Privacy + price.** "Mac-only. Local-first. €15/mo. Cancel anytime."

**One CTA, repeated 3 times: "Join the beta"** → email capture → autoresponder → DMG link in email #2 (24h delay creates anticipation, not friction; ICP is patient for prestige).

Reference inspiration: Linear's landing, Raycast's landing, Superhuman's landing. NOT a typical SaaS marketing site.

### Waitlist mechanics

- Position scarcity, but don't fake it. "Beta capped at 500 to keep support tight" is honest. "Only 23 spots left!!" is sleazy.
- Each waitlist signup gets a **referral link**. Move up the queue by referring friends. **This is the single highest-leverage growth lever** for ICP — top-school students literally compare their queue position in WhatsApp groups.
- Refer 3 friends → instant access. Refer 10 → free first month. Refer 25 → "Founders Circle" badge in the app + lifetime 50% off.

---

## 6. Creator collabs — surgical, not sprayed

### The right tier for M1-M3

Tier 2 + Tier 3 creators ONLY. Mega-influencers are wrong.

| Tier | Followers | Cost (FR) | Cost (US) | When |
|---|---|---|---|---|
| **T1 (mega)** | 500k+ | €5-25k/post | $10-50k/post | NEVER in year 1. Wrong audience match, wrong economics. |
| **T2 (macro)** | 50-500k | €500-3k/post | $1-5k/post | M3-M6, after format proven. Pick career-niche only. |
| **T3 (micro)** | 5-50k | €0-300/post (often free for product) | $0-500/post | **M1 — start here.** |
| **T4 (nano)** | <5k students at target schools | Free | Free | **M0 — friends + alumni network.** Highest conversion of any tier. |

### T4 outreach script (the playbook)

10 of your former classmates / friends at HEC, ESCP, etc. are casually creating career content with 500-3000 followers. They're undervalued, accessible, and their audience IS your ICP.

DM template (FR):

> "Hello [name], j'ai vu ton post sur [X] — gros respect pour ce que tu fais. Je build Career OS, un OS pour les candidats top firms (consulting / IB / tech) — ATS analyzer, tracker, prep, tout en local sur Mac. J'aimerais t'envoyer un accès lifetime gratuit, juste pour avoir ton retour cash. Si t'aimes, t'en parles, sinon non — zéro pression. Ça t'intéresse ?"

What works:
- No CTA in DM #1 except "tu veux essayer"
- Lifetime access, not a coupon — frame the gift, not the trade
- "Zéro pression" disarms the "this is sponcon" reflex
- Don't send a media kit. Send the actual app.

Goal: 30 outreach DMs in week 1, 10-15 actually try, 3-5 post organically over 2 months.

### Tier 2 paid posts (M3+)

Only run paid creator posts after you have:
- Proven the bio-link → waitlist → activate funnel converts
- A landing page that holds water
- ≥50 paying users from organic so you can A/B isolate creator impact

Otherwise you're paying €2k/post with no way to attribute results, no way to iterate.

---

## 7. The 90-day plan

### Phase 1 — Foundation (Week 1-2)

- [ ] Domain `careeros.app` or fallback. Cloudflare Pages landing.
- [ ] Beta wait-list integration (Loops or Resend; not Mailchimp)
- [ ] TikTok account `@careeros` + founder account, both verified-ready (real photo, link, bio under 80 chars)
- [ ] Instagram both accounts created, linked to TT
- [ ] Bio link tool: a single page on careeros.app/links — never use Linktree (slow, off-brand)
- [ ] First 5 TikToks shot + scheduled (cover all 5 pillars)
- [ ] Loom welcome video (founder-to-camera, 60s) for waitlist autoresponder

### Phase 2 — Seeding (Week 3-6)

- [ ] 7 videos/week pace
- [ ] 30 T4 creator DMs (target: 10-15 try, 3-5 post)
- [ ] Daily IG stories
- [ ] 2 carousels/week
- [ ] First 50 friends + alumni network onboarded as beta users — **demand 5-min onboarding call with each**, recorded, mined for testimonials

### Phase 3 — Iteration (Week 7-12)

- [ ] Identify the 1-2 winning hook formats from M1 data; double down
- [ ] First testimonial-led TikTok ("Marie, HEC, used Career OS to land Bain — here's how")
- [ ] First T2 paid creator if (and only if) M2 funnel proved
- [ ] **Decision point at D90**: ≥150 activated week-1 users → scale. <50 → re-pick narrative or persona.

### Decision gates — when to pivot

| Signal at D30 | At D60 | At D90 | Move |
|---|---|---|---|
| <500 waitlist | <2k | <5k | Hook isn't landing. Re-test 5 new hooks. |
| Waitlist OK, install <30% | install <30% | install <30% | Landing → install friction. Loom intro broken or DMG too scary. |
| Install OK, activation <30% | activation <30% | activation <30% | First-run UX broken. Onboarding rebuild. |
| Activation OK, paid <5% at D60 | <5% at D90 |  | Pricing or feature gap. Talk to 20 churned users. |

---

## 8. Brand voice — operational rules

The voice is consistent across TikTok / IG / landing / app / emails / DMs. It's:

**Confident.** Not arrogant. We know the job market. We know the user. We don't qualify our claims with "maybe" or "we think".

**Technical when it matters.** Don't dumb it down. ICP is sophisticated. "ATS keyword density" lands better than "make your CV stand out". "Tauri 2 native, not Electron" lands with the tech crowd.

**Candid about flaws.** "Mac-only because we'd ship a worse Windows version" beats pretending universality. The audit-roast philosophy from the codebase carries to marketing — own the gaps, fix them in public.

**French AND English, not Franglais.** When in FR, full FR. When in EN, full EN. The Live Copilot itself code-switches by question language — same rule for marketing. Mixing on the same post = confused brand.

**Never:**
- Say "AI-powered" — say what it does
- Use "revolutionize" / "disrupt" / "game-changer"
- Use stock photos of diverse people in suits
- Hide pricing
- Bait-and-switch in CTAs

---

## 9. Risks & guardrails

| Risk | Mitigation |
|---|---|
| Live Copilot framed as "cheating tool" by media | Lead with B narrative. Refuse interviews that want to angle this. Keep the feature gated 2 clicks deep in the product story. |
| Recruiter blacklist of users | Privacy-first messaging is true and defensible. App never shows on shared screen; Keychain-stored keys; local-first. We sell prep + signal, not deception. |
| FR market regulation on AI in interviews | Stay ahead — voluntary disclosure of capabilities, partner with 1-2 schools officially in M3-M6 for cover. |
| Founder bandwidth burnout | Cap content at 7 videos/week. Bank batches of 10 at once. Use the existing repo as the moat — code that the user spent 3 months building doesn't depend on more content next week. |
| One viral video drives the wrong audience | Track activation rate by acquisition video. Kill formats with high views + low activation. |
| Competitive copycat (Cluely-style) | The product is 4 surfaces deep (Apply / CV / Prep / Copilot). Single-feature clones can't catch up. Ship faster on the OS narrative. |

---

## 10. The first move

If you do nothing else this week:

1. Buy `careeros.app` (or chosen domain) — €15
2. Stand up a single-page landing with the hero + 12s screen recording + one CTA
3. Shoot 5 founder-mode TikToks tonight — phone, no script, the 5 pillars (one each), don't over-edit
4. DM 10 friends at HEC / ESSEC / Polytechnique who post career content. Lifetime access offer.
5. Set the **Activated Week-1 User** counter as your only metric in a Notion doc

Everything else is downstream of those 5 moves.

---

*Living doc. Iterate after every decision gate. Kill ideas that don't ship.*
