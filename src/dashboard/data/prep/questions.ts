/**
 * Seed bank for the Prep question library.
 *
 * Curated set inspired by the canonical sources for each track —
 * ~50 questions total. Goal: feel real on first use, validate the
 * schema, give the UI something meaningful to render. The schema is
 * built to accept thousands more — when we plug in the SQLite back-
 * end (Tauri + sqlx is already wired for CV/Job storage), this
 * static array becomes a one-time bootstrap migration.
 *
 * Conventions:
 *  - id: `${track}.${topicSlug}.${slug}` — stable, kebab-case.
 *  - durationMin: realistic interview-prep budget (skim then practise).
 *  - tags: free-form filterable atoms — frameworks (STAR, Pyramid,
 *    MECE), seniority (junior, senior), specific firms (Goldman,
 *    McKinsey, Stripe), keywords (DCF, transformer, recursion).
 *  - knownAtCompanies: companies known to ask THIS exact / very
 *    similar question. Optional but powerful when set — it lets the
 *    War Room match questions to the user's target company.
 *
 * Future automation can ingest CSV / scraped data into the same
 * shape; the UI never has to change.
 */

import type { PrepQuestionV2 } from '../../store/types';

export const SEED_QUESTIONS: PrepQuestionV2[] = [
  // ── Finance · Valuation / DCF ────────────────────────────────
  {
    id: 'finance.dcf.walk-me-through-a-dcf',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.valuation-dcf'],
    difficulty: 'medium',
    tags: ['DCF', 'WACC', 'free cash flow', 'terminal value'],
    question: 'Walk me through a DCF — every step, in order. What goes into the WACC, why the terminal value matters, and how you sanity-check the output multiple.',
    followUps: [
      'Why did you pick that growth rate for the terminal value?',
      "What's the impact of a 100bp change in the WACC on equity value?",
      'When would you NOT use a DCF?',
    ],
    durationMin: 12,
    source: 'WSO IBD prep · Bouzouba',
    knownAtCompanies: ['Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Lazard', 'Rothschild'],
  },
  {
    id: 'finance.dcf.terminal-value-methods',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.valuation-dcf'],
    difficulty: 'medium',
    tags: ['terminal value', 'Gordon growth', 'exit multiple'],
    question: 'Compare the perpetuity growth method vs the exit-multiple method for terminal value. When does each break down?',
    followUps: ['Which one is more defensible to a board? Why?'],
    durationMin: 8,
    source: 'Bouzouba',
  },
  {
    id: 'finance.dcf.beta-leverage',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.valuation-dcf'],
    difficulty: 'hard',
    tags: ['beta', 'leverage', 'unlevered', 'comparables'],
    question: 'How do you unlever and re-lever beta when computing WACC for a private target whose comps are mostly listed? What pitfalls show up at high leverage?',
    durationMin: 10,
    source: 'Bouzouba',
  },

  // ── Finance · LBO / PE ──────────────────────────────────────
  {
    id: 'finance.lbo.walk-me-through-an-lbo',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.lbo-pe'],
    difficulty: 'medium',
    tags: ['LBO', 'IRR', 'capital structure', 'value creation'],
    question: 'Walk me through an LBO — purchase, capital structure, the value-creation levers, and how you bridge entry IRR to exit IRR.',
    followUps: [
      'Where does the IRR really come from on a typical mid-cap LBO?',
      'How does PIK financing change the picture?',
    ],
    durationMin: 12,
    source: 'WSO PE guide',
    knownAtCompanies: ['KKR', 'Bain Capital', 'Apollo', 'Carlyle', 'Cinven', 'Ardian'],
  },
  {
    id: 'finance.lbo.value-creation-levers',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.lbo-pe'],
    difficulty: 'hard',
    tags: ['value creation', 'multiple expansion', 'EBITDA growth', 'deleveraging'],
    question: 'Decompose the IRR of an LBO into multiple expansion, EBITDA growth, and deleveraging. Which lever should a junior PE associate focus on first in due diligence and why?',
    durationMin: 10,
    source: 'Bain Capital case prep',
  },

  // ── Finance · M&A ────────────────────────────────────────────
  {
    id: 'finance.ma.accretion-dilution',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.ma-modeling'],
    difficulty: 'medium',
    tags: ['accretion-dilution', 'EPS', 'cash vs stock', 'synergies'],
    question: 'Why is a deal accretive vs dilutive? Walk me through the math on a simple cash-vs-stock decision.',
    followUps: [
      'How do synergies change the answer?',
      'What about the impact of goodwill amortisation?',
    ],
    durationMin: 8,
    source: 'WSO M&A guide',
    knownAtCompanies: ['Lazard', 'Rothschild', 'Centerview', 'Goldman Sachs'],
  },
  {
    id: 'finance.ma.synergies-due-diligence',
    track: 'finance',
    format: 'case',
    topicIds: ['finance.ma-modeling'],
    difficulty: 'hard',
    tags: ['synergies', 'due diligence', 'integration'],
    question: 'A consumer-goods buyer expects €100m of cost synergies on a €1bn acquisition. How do you stress-test that number, and what would you flag to your MD before sign-off?',
    durationMin: 15,
  },

  // ── Finance · Derivatives (Hull) ────────────────────────────
  {
    id: 'finance.options.delta-hedging',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.derivatives-options'],
    difficulty: 'hard',
    tags: ['delta', 'hedging', 'gamma', 'Hull'],
    question: 'Explain delta hedging. Why is it costly in practice, and how does gamma play into the rebalancing frequency?',
    followUps: [
      'How does the volatility surface affect the cost?',
      'What changes if the underlying gaps overnight?',
    ],
    durationMin: 12,
    source: 'Hull · Options, Futures and Other Derivatives',
    knownAtCompanies: ['JP Morgan', 'BNP Paribas', 'Optiver', 'IMC', 'Citadel'],
  },
  {
    id: 'finance.options.black-scholes-assumptions',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.derivatives-options'],
    difficulty: 'medium',
    tags: ['Black-Scholes', 'volatility', 'assumptions', 'Hull'],
    question: 'Name the Black-Scholes assumptions. Pick the one that breaks first in a real options market and explain why.',
    durationMin: 8,
    source: 'Hull · Chapter 13',
  },
  {
    id: 'finance.options.greeks-quick-fire',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.derivatives-options'],
    difficulty: 'medium',
    tags: ['Greeks', 'delta', 'gamma', 'vega', 'theta', 'Hull'],
    question: "Quick-fire: I'm long 100 ATM call options. Tell me the sign and rough magnitude of each Greek I'm exposed to.",
    durationMin: 6,
    source: 'Hull',
  },

  // ── Finance · Markets / Trading ─────────────────────────────
  {
    id: 'finance.markets.yield-curve-steepens',
    track: 'finance',
    format: 'technical',
    topicIds: ['finance.markets-trading'],
    difficulty: 'medium',
    tags: ['yield curve', 'macro', 'rates'],
    question: 'The 2s10s steepens by 50bp this week. What probably drove it, and what trade does a macro fund put on?',
    durationMin: 8,
    knownAtCompanies: ['Goldman Sachs', 'Bridgewater', 'Citadel'],
  },

  // ── Finance · Behavioral ────────────────────────────────────
  {
    id: 'finance.behavioral.why-ibd',
    track: 'finance',
    format: 'motivation',
    topicIds: ['finance.behavioral'],
    difficulty: 'easy',
    tags: ['why IBD', 'motivation', 'STAR'],
    question: 'Why investment banking, why now, and why this bank specifically? Be specific — the generic answer kills you here.',
    durationMin: 4,
    knownAtCompanies: ['Goldman Sachs', 'JP Morgan', 'Lazard', 'Rothschild'],
  },
  {
    id: 'finance.behavioral.failed-deal',
    track: 'finance',
    format: 'behavioral',
    topicIds: ['finance.behavioral', 'general.star-stories'],
    difficulty: 'medium',
    tags: ['STAR', 'failure', 'learning', 'behavioral'],
    question: "Tell me about a deal or project that failed. What was your role, what would you do differently, and what's the long-term takeaway?",
    durationMin: 6,
  },

  // ── Consulting · Market sizing ──────────────────────────────
  {
    id: 'consulting.sizing.coffee-shops-paris',
    track: 'consulting',
    format: 'case',
    topicIds: ['consulting.market-sizing'],
    difficulty: 'medium',
    tags: ['market sizing', 'top-down', 'bottom-up'],
    question: 'Estimate the number of independent coffee shops in Paris (excluding chains). Walk me through your structure, then your number, then your sanity check.',
    durationMin: 10,
    source: 'BCG case archive',
    knownAtCompanies: ['BCG', 'McKinsey', 'Bain'],
  },
  {
    id: 'consulting.sizing.ev-charging-eu',
    track: 'consulting',
    format: 'case',
    topicIds: ['consulting.market-sizing'],
    difficulty: 'hard',
    tags: ['market sizing', 'EV', 'infrastructure'],
    question: "Size the EU's EV-charging-station market in 2030. State your assumptions explicitly — your interviewer will pull the thread.",
    durationMin: 15,
    source: 'McKinsey energy practice',
  },

  // ── Consulting · Profitability ──────────────────────────────
  {
    id: 'consulting.profitability.airline-margin-drop',
    track: 'consulting',
    format: 'case',
    topicIds: ['consulting.profitability'],
    difficulty: 'medium',
    tags: ['profitability', 'P&L', 'margin', 'MECE'],
    question: 'Our client is a low-cost airline whose EBIT margin dropped 4 points in 18 months while competitors held steady. What is the structure of your investigation? Where do you start?',
    followUps: ['What internal data do you ask for first?', "What's your hypothesis at the 5-minute mark?"],
    durationMin: 18,
    source: 'BCG case archive',
    knownAtCompanies: ['BCG', 'McKinsey', 'Bain', 'Strategy&', 'Roland Berger'],
  },

  // ── Consulting · M&A advisory ───────────────────────────────
  {
    id: 'consulting.ma.cultural-fit',
    track: 'consulting',
    format: 'case',
    topicIds: ['consulting.ma-advisory'],
    difficulty: 'hard',
    tags: ['M&A', 'integration', 'culture'],
    question: 'A French luxury group wants to acquire an American DTC brand. The price is fine; the board is worried about culture clash. How do you de-risk that for them?',
    durationMin: 15,
  },

  // ── Consulting · Operations ─────────────────────────────────
  {
    id: 'consulting.ops.factory-throughput',
    track: 'consulting',
    format: 'case',
    topicIds: ['consulting.operations'],
    difficulty: 'medium',
    tags: ['operations', 'capacity', 'lean'],
    question: 'A pharma client wants to double the throughput of an injectable line without doubling capex. Where do you look first, and how do you decide between a process redesign vs a 3-shift schedule vs a parallel line?',
    durationMin: 15,
    source: 'McKinsey ops practice',
  },

  // ── Consulting · Brain teaser ───────────────────────────────
  {
    id: 'consulting.brainteaser.coins-fountain',
    track: 'consulting',
    format: 'brain-teaser',
    topicIds: ['consulting.brain-teaser'],
    difficulty: 'easy',
    tags: ['estimation', 'brain teaser'],
    question: 'How many coins are at the bottom of the Trevi Fountain right now? You have 90 seconds.',
    durationMin: 3,
  },

  // ── Consulting · Behavioral ─────────────────────────────────
  {
    id: 'consulting.behavioral.why-mbb',
    track: 'consulting',
    format: 'motivation',
    topicIds: ['consulting.behavioral'],
    difficulty: 'easy',
    tags: ['why consulting', 'motivation'],
    question: 'Why MBB, why this specific firm, and why not the competitor down the street? Three answers, two minutes.',
    durationMin: 4,
    knownAtCompanies: ['McKinsey', 'BCG', 'Bain'],
  },

  // ── Product · Strategy ──────────────────────────────────────
  {
    id: 'product.strategy.next-product-stripe',
    track: 'product',
    format: 'case',
    topicIds: ['product.strategy'],
    difficulty: 'hard',
    tags: ['strategy', 'roadmap', 'TAM'],
    question: "If you were running Stripe's product team next quarter, what's the next product you'd build and why? Defend it against the obvious objections.",
    durationMin: 20,
    knownAtCompanies: ['Stripe', 'Shopify', 'Square'],
  },

  // ── Product · Metrics ───────────────────────────────────────
  {
    id: 'product.metrics.dau-drop',
    track: 'product',
    format: 'case',
    topicIds: ['product.metrics'],
    difficulty: 'medium',
    tags: ['DAU', 'retention', 'funnel', 'AB testing'],
    question: 'Our DAU dropped 8% week-over-week with no obvious release in the past 14 days. Walk me through your investigation — first 60 minutes.',
    durationMin: 15,
    source: 'Decode and Conquer',
    knownAtCompanies: ['Meta', 'Google', 'Snap'],
  },

  // ── Product · Design (CIRCLES) ──────────────────────────────
  {
    id: 'product.design.airbnb-for-experiences',
    track: 'product',
    format: 'case',
    topicIds: ['product.design-circles'],
    difficulty: 'medium',
    tags: ['CIRCLES', 'product design', 'JTBD'],
    question: "Design a product for Airbnb that captures the 'experiences' market without cannibalising the rental flow. Use CIRCLES to structure your answer.",
    durationMin: 20,
  },

  // ── Product · Estimation ────────────────────────────────────
  {
    id: 'product.estimation.youtube-storage',
    track: 'product',
    format: 'case',
    topicIds: ['product.estimation'],
    difficulty: 'medium',
    tags: ['estimation', 'storage'],
    question: "How many bytes of new video does YouTube store every day? Don't quote a number — show me the structure.",
    durationMin: 8,
    knownAtCompanies: ['Google', 'YouTube', 'Meta'],
  },

  // ── Product · Behavioral ────────────────────────────────────
  {
    id: 'product.behavioral.influence-without-authority',
    track: 'product',
    format: 'behavioral',
    topicIds: ['product.behavioral', 'general.star-stories'],
    difficulty: 'medium',
    tags: ['STAR', 'influence', 'stakeholder'],
    question: 'Tell me about a time you got a strong-willed engineering team to ship something they initially disagreed with. STAR.',
    durationMin: 6,
    knownAtCompanies: ['Stripe', 'Linear', 'Notion', 'Figma'],
  },

  // ── SWE · Arrays & hashing ──────────────────────────────────
  {
    id: 'swe.arrays.two-sum',
    track: 'swe',
    format: 'coding',
    topicIds: ['swe.arrays-hashing'],
    difficulty: 'easy',
    tags: ['arrays', 'hashmap', 'O(n)'],
    question: 'Given an array of integers and a target, return the indices of the two numbers that sum to target. Discuss space-time trade-offs.',
    followUps: [
      'Now solve it in O(n) without sorting.',
      'What if the array is sorted to begin with?',
    ],
    durationMin: 15,
    source: 'LeetCode #1',
    knownAtCompanies: ['Google', 'Meta', 'Amazon', 'Microsoft'],
  },
  {
    id: 'swe.arrays.longest-substring-no-repeat',
    track: 'swe',
    format: 'coding',
    topicIds: ['swe.arrays-hashing'],
    difficulty: 'medium',
    tags: ['sliding window', 'string', 'hashmap'],
    question: 'Find the length of the longest substring without repeating characters. Use a sliding window — explain the invariant.',
    durationMin: 20,
    source: 'LeetCode #3',
  },

  // ── SWE · Trees & graphs ────────────────────────────────────
  {
    id: 'swe.trees.lowest-common-ancestor',
    track: 'swe',
    format: 'coding',
    topicIds: ['swe.trees-graphs'],
    difficulty: 'medium',
    tags: ['trees', 'recursion', 'LCA'],
    question: 'Find the lowest common ancestor of two nodes in a binary tree (NOT BST). Discuss recursion vs the parent-pointer approach.',
    durationMin: 20,
    source: 'LeetCode #236',
  },
  {
    id: 'swe.graphs.course-schedule',
    track: 'swe',
    format: 'coding',
    topicIds: ['swe.trees-graphs'],
    difficulty: 'medium',
    tags: ['graphs', 'topological sort', 'DAG'],
    question: 'You can take a course only if its prerequisites are taken first. Given the prereq pairs, can you finish all courses? Topological sort with cycle detection.',
    durationMin: 20,
    source: 'LeetCode #207',
  },

  // ── SWE · DP ────────────────────────────────────────────────
  {
    id: 'swe.dp.coin-change',
    track: 'swe',
    format: 'coding',
    topicIds: ['swe.dynamic-programming'],
    difficulty: 'medium',
    tags: ['DP', 'unbounded knapsack', 'tabulation'],
    question: 'Given coin denominations and a target amount, return the fewest coins. Walk me through the recurrence and the tabulation.',
    durationMin: 20,
    source: 'LeetCode #322',
  },

  // ── SWE · System design ─────────────────────────────────────
  {
    id: 'swe.system.design-tinyurl',
    track: 'swe',
    format: 'system-design',
    topicIds: ['swe.system-design'],
    difficulty: 'medium',
    tags: ['system design', 'caching', 'sharding', 'KV store'],
    question: 'Design TinyURL — handles 100M URLs, 1B reads/day, 10M writes/day. Cover storage, hashing scheme, caching, and one trade-off you would push back on.',
    durationMin: 45,
    source: 'Designing Data-Intensive Applications · System Design Interview vol. 1',
    knownAtCompanies: ['Google', 'Meta', 'Stripe', 'Cloudflare'],
  },
  {
    id: 'swe.system.rate-limiter',
    track: 'swe',
    format: 'system-design',
    topicIds: ['swe.system-design'],
    difficulty: 'medium',
    tags: ['rate limiting', 'token bucket', 'sliding window'],
    question: 'Design a distributed rate limiter for a public API: 1k req/s per key. Compare token bucket, leaky bucket, and sliding window.',
    durationMin: 40,
  },

  // ── SWE · Behavioral ────────────────────────────────────────
  {
    id: 'swe.behavioral.production-incident',
    track: 'swe',
    format: 'behavioral',
    topicIds: ['swe.behavioral', 'general.star-stories'],
    difficulty: 'medium',
    tags: ['STAR', 'on-call', 'incident'],
    question: 'Tell me about a production incident you led the response on. What was the trigger, the timeline, and what changed afterwards?',
    durationMin: 6,
    knownAtCompanies: ['Stripe', 'Cloudflare', 'Datadog'],
  },

  // ── AI · ML fundamentals ────────────────────────────────────
  {
    id: 'ai.ml.bias-variance',
    track: 'ai',
    format: 'technical',
    topicIds: ['ai.ml-fundamentals'],
    difficulty: 'medium',
    tags: ['bias-variance', 'overfitting', 'regularisation'],
    question: 'Explain the bias-variance trade-off. How do early-stopping, dropout, and L2 regularisation differ in how they push you along the trade-off?',
    durationMin: 8,
    source: 'Chip Huyen · ML Interviews',
  },
  {
    id: 'ai.ml.regression-vs-classification-metrics',
    track: 'ai',
    format: 'technical',
    topicIds: ['ai.ml-fundamentals'],
    difficulty: 'easy',
    tags: ['metrics', 'precision', 'recall', 'AUC'],
    question: 'A team optimises for AUC and ships a model. The product owner says false positives are killing them. How do you re-frame the metric and what do you ship next?',
    durationMin: 6,
  },

  // ── AI · Deep learning ──────────────────────────────────────
  {
    id: 'ai.dl.transformer-attention',
    track: 'ai',
    format: 'technical',
    topicIds: ['ai.deep-learning'],
    difficulty: 'hard',
    tags: ['transformer', 'attention', 'self-attention'],
    question: 'Walk me through self-attention end-to-end. Why is it Q·Kᵀ·V/√d? Where does multi-head attention buy you something a single head does not?',
    durationMin: 12,
    source: 'Karpathy nanoGPT walkthrough',
    knownAtCompanies: ['OpenAI', 'Anthropic', 'Google DeepMind', 'Mistral AI'],
  },

  // ── AI · LLMs / RAG / Agents ────────────────────────────────
  {
    id: 'ai.llm.rag-vs-finetune',
    track: 'ai',
    format: 'case',
    topicIds: ['ai.llms-and-agents'],
    difficulty: 'hard',
    tags: ['RAG', 'fine-tuning', 'evals', 'production'],
    question: 'A B2B customer wants the LLM to answer in their internal-jargon style on private docs. RAG, fine-tune, or both? Walk me through the decision and the eval plan.',
    durationMin: 15,
    source: 'Chip Huyen · LLM in production',
    knownAtCompanies: ['Anthropic', 'OpenAI', 'Mistral AI', 'Cohere'],
  },
  {
    id: 'ai.llm.agent-tool-use-failure',
    track: 'ai',
    format: 'case',
    topicIds: ['ai.llms-and-agents'],
    difficulty: 'expert',
    tags: ['agents', 'tool use', 'evals', 'reliability'],
    question: 'Your agent calls 4 tools in a chain to refund a customer. It hits 91% success offline but 67% in prod. Where do you start debugging, and how do you build the eval set?',
    durationMin: 20,
  },
  {
    id: 'ai.llm.prompt-injection',
    track: 'ai',
    format: 'technical',
    topicIds: ['ai.llms-and-agents'],
    difficulty: 'hard',
    tags: ['prompt injection', 'security', 'agents'],
    question: 'You ship a customer-support agent that has tool access (email + refund). Walk me through the prompt-injection attack surface and the layered defenses you would deploy.',
    durationMin: 12,
  },

  // ── AI · MLOps / Production ─────────────────────────────────
  {
    id: 'ai.mlops.drift-detection',
    track: 'ai',
    format: 'technical',
    topicIds: ['ai.mlops-production'],
    difficulty: 'medium',
    tags: ['drift', 'monitoring', 'production'],
    question: 'How do you detect feature drift vs label drift in production? What signals would you monitor, and what action does each one trigger?',
    durationMin: 10,
  },

  // ── AI · System design ──────────────────────────────────────
  {
    id: 'ai.system.recommender',
    track: 'ai',
    format: 'system-design',
    topicIds: ['ai.system-design'],
    difficulty: 'hard',
    tags: ['recommender', 'two-tower', 'ranking'],
    question: 'Design a recommender for a product like Spotify. Two-stage retrieval + ranking? Cold start? Latency budget at p99?',
    durationMin: 45,
    source: 'Designing Machine Learning Systems',
    knownAtCompanies: ['Spotify', 'Netflix', 'TikTok', 'YouTube'],
  },

  // ── AI · Behavioral ─────────────────────────────────────────
  {
    id: 'ai.behavioral.research-vs-applied',
    track: 'ai',
    format: 'behavioral',
    topicIds: ['ai.behavioral', 'general.star-stories'],
    difficulty: 'medium',
    tags: ['STAR', 'research', 'applied', 'autonomy'],
    question: 'Tell me about a time you had to choose between a research-quality solution and a ship-quality one. What did you pick and why?',
    durationMin: 6,
    knownAtCompanies: ['Anthropic', 'OpenAI', 'DeepMind', 'Mistral AI'],
  },

  // ── Data · SQL ──────────────────────────────────────────────
  {
    id: 'data.sql.window-running-total',
    track: 'data',
    format: 'technical',
    topicIds: ['data.sql'],
    difficulty: 'medium',
    tags: ['SQL', 'window functions', 'running total'],
    question: 'Write the SQL for a 7-day rolling DAU per cohort. No subqueries — pure window functions.',
    durationMin: 12,
    source: 'Mode SQL tutorials',
    knownAtCompanies: ['Stripe', 'Airbnb', 'Lyft'],
  },

  // ── Data · Statistics ───────────────────────────────────────
  {
    id: 'data.stats.ab-test-ship-or-not',
    track: 'data',
    format: 'case',
    topicIds: ['data.statistics'],
    difficulty: 'hard',
    tags: ['A/B testing', 'p-value', 'power'],
    question: 'An A/B test is at p=0.07 after 7 days. Stakeholders want to ship. What do you tell them, and how would you re-run it cleanly?',
    durationMin: 12,
    source: 'Trustworthy Online Experiments',
    knownAtCompanies: ['Microsoft', 'Booking', 'Airbnb'],
  },

  // ── General · STAR stories ──────────────────────────────────
  {
    id: 'general.star.failure-and-learning',
    track: 'general',
    format: 'behavioral',
    topicIds: ['general.star-stories'],
    difficulty: 'medium',
    tags: ['STAR', 'failure', 'growth'],
    question: 'Tell me about your biggest professional failure — what happened, what you owned, and what you do differently now.',
    durationMin: 6,
  },
  {
    id: 'general.star.disagree-and-commit',
    track: 'general',
    format: 'behavioral',
    topicIds: ['general.star-stories'],
    difficulty: 'medium',
    tags: ['STAR', 'leadership', 'disagree-commit', 'Amazon LP'],
    question: "Tell me about a time you disagreed with your manager on a decision but committed once it was made. How did it play out, and what did you learn?",
    durationMin: 6,
    knownAtCompanies: ['Amazon', 'Stripe', 'Anthropic'],
  },
  {
    id: 'general.star.leadership-without-authority',
    track: 'general',
    format: 'behavioral',
    topicIds: ['general.star-stories'],
    difficulty: 'medium',
    tags: ['STAR', 'leadership', 'influence'],
    question: 'Describe a moment you led a team that did not report to you. How did you build credibility, and how did you measure success?',
    durationMin: 6,
  },
  {
    id: 'general.motivation.why-this-firm',
    track: 'general',
    format: 'motivation',
    topicIds: ['general.motivation'],
    difficulty: 'easy',
    tags: ['motivation', 'why this firm'],
    question: 'Why this firm specifically, and why now? Show me you did the homework — the hiring manager hates the generic answer.',
    durationMin: 4,
  },
  {
    id: 'general.career.walk-me-through-cv',
    track: 'general',
    format: 'behavioral',
    topicIds: ['general.career-arc'],
    difficulty: 'easy',
    tags: ['walk through CV', 'narrative arc'],
    question: 'Walk me through your CV in under 90 seconds — the through-line that makes the next role inevitable.',
    durationMin: 3,
  },
  {
    id: 'general.weakness.pick-a-real-one',
    track: 'general',
    format: 'behavioral',
    topicIds: ['general.strengths-weaknesses'],
    difficulty: 'easy',
    tags: ['weakness', 'self-awareness'],
    question: "What's a real weakness — not 'I work too hard'? What you did about it last quarter, and what you still struggle with.",
    durationMin: 4,
  },
];
