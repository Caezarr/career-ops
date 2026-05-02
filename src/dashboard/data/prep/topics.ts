/**
 * Topic-level taxonomy. Each track has 5-8 topics that map onto how
 * a real candidate organises their prep ("Today I'm doing DCFs",
 * "Tomorrow it's market sizing", "This week leetcode trees").
 *
 * The id is a slugged kebab-case stable string — questions reference
 * topics by id, never by label, so we can rename labels without
 * breaking the bank. New topics get appended; we never re-order ids.
 */

import type { QuestionTrack } from '../../store/types';

export interface TopicMeta {
  id: string; // slug — stable, never rename
  track: QuestionTrack;
  label: string;
  /** Short hint shown under the topic chip. */
  hint?: string;
}

export const TOPICS: TopicMeta[] = [
  // ── Finance ────────────────────────────────────────────────────
  { id: 'finance.valuation-dcf', track: 'finance', label: 'DCF & Valuation', hint: 'Discount rates, WACC, terminal value, multiples.' },
  { id: 'finance.lbo-pe', track: 'finance', label: 'LBO & Private Equity', hint: 'Capital structures, IRR, value-creation levers.' },
  { id: 'finance.ma-modeling', track: 'finance', label: 'M&A Modeling', hint: 'Accretion-dilution, synergies, deal structures.' },
  { id: 'finance.derivatives-options', track: 'finance', label: 'Derivatives & Options', hint: 'Black-Scholes, Greeks, hedging — Hull style.' },
  { id: 'finance.markets-trading', track: 'finance', label: 'Markets & Trading', hint: 'Macro, rates, FX, market structure.' },
  { id: 'finance.accounting', track: 'finance', label: 'Accounting & 3-statement', hint: 'EBITDA bridges, working capital, IFRS vs GAAP.' },
  { id: 'finance.behavioral', track: 'finance', label: 'Behavioral / Fit', hint: 'Why GS / why IBD / deals walkthrough.' },

  // ── Consulting ─────────────────────────────────────────────────
  { id: 'consulting.market-sizing', track: 'consulting', label: 'Market Sizing', hint: 'Top-down + bottom-up, sanity checks.' },
  { id: 'consulting.profitability', track: 'consulting', label: 'Profitability', hint: 'Revenue × volume / cost decomposition.' },
  { id: 'consulting.ma-advisory', track: 'consulting', label: 'M&A Advisory', hint: 'Synergies, due-diligence, cultural fit.' },
  { id: 'consulting.operations', track: 'consulting', label: 'Operations & Cost', hint: 'Capacity, lean, supply chain.' },
  { id: 'consulting.growth-strategy', track: 'consulting', label: 'Growth Strategy', hint: 'Geographic + product expansion.' },
  { id: 'consulting.brain-teaser', track: 'consulting', label: 'Brain Teaser', hint: 'Estimation, logic puzzles.' },
  { id: 'consulting.behavioral', track: 'consulting', label: 'Behavioral / Fit', hint: 'Why MBB, leadership, conflict.' },

  // ── Product ────────────────────────────────────────────────────
  { id: 'product.strategy', track: 'product', label: 'Product Strategy', hint: 'Vision, prioritisation, RICE, north-star.' },
  { id: 'product.metrics', track: 'product', label: 'Metrics & Analysis', hint: 'Funnels, retention, A/B testing reading.' },
  { id: 'product.design-circles', track: 'product', label: 'Product Design (CIRCLES)', hint: 'Design a feature, jobs-to-be-done.' },
  { id: 'product.estimation', track: 'product', label: 'Estimation', hint: 'How many X / sizing the impact.' },
  { id: 'product.case', track: 'product', label: 'Product Case', hint: 'Diagnose drop, launch a product, fix retention.' },
  { id: 'product.behavioral', track: 'product', label: 'Behavioral / Fit', hint: 'Influence without authority, stakeholder mgmt.' },

  // ── SWE ────────────────────────────────────────────────────────
  { id: 'swe.arrays-hashing', track: 'swe', label: 'Arrays & Hashing', hint: 'Two-pointers, sliding window, frequency maps.' },
  { id: 'swe.trees-graphs', track: 'swe', label: 'Trees & Graphs', hint: 'BFS, DFS, recursion, topological sort.' },
  { id: 'swe.dynamic-programming', track: 'swe', label: 'Dynamic Programming', hint: '1D, 2D, memoisation vs tabulation.' },
  { id: 'swe.system-design', track: 'swe', label: 'System Design', hint: 'Scale, sharding, caching, eventing.' },
  { id: 'swe.concurrency', track: 'swe', label: 'Concurrency & Distributed', hint: 'Locks, consensus, CAP, queues.' },
  { id: 'swe.behavioral', track: 'swe', label: 'Behavioral / Fit', hint: 'Engineering excellence, ownership, ambiguity.' },

  // ── AI / ML ────────────────────────────────────────────────────
  { id: 'ai.ml-fundamentals', track: 'ai', label: 'ML Fundamentals', hint: 'Bias-variance, regularisation, evaluation.' },
  { id: 'ai.deep-learning', track: 'ai', label: 'Deep Learning', hint: 'CNNs, RNNs, transformers, attention.' },
  { id: 'ai.llms-and-agents', track: 'ai', label: 'LLMs, RAG & Agents', hint: 'Prompting, RAG, tool use, evals, MCP.' },
  { id: 'ai.mlops-production', track: 'ai', label: 'MLOps / Production', hint: 'Deployment, monitoring, drift, A/B.' },
  { id: 'ai.system-design', track: 'ai', label: 'AI System Design', hint: 'Recommender, search, real-time inference.' },
  { id: 'ai.behavioral', track: 'ai', label: 'Behavioral / Fit', hint: 'Research vs applied, ethics, autonomy.' },

  // ── Data ───────────────────────────────────────────────────────
  { id: 'data.sql', track: 'data', label: 'SQL', hint: 'Joins, window functions, performance.' },
  { id: 'data.statistics', track: 'data', label: 'Statistics & A/B', hint: 'p-values, power, confidence intervals.' },
  { id: 'data.engineering', track: 'data', label: 'Data Engineering', hint: 'ETL/ELT, warehouses, lakehouses.' },
  { id: 'data.behavioral', track: 'data', label: 'Behavioral / Fit', hint: 'Influencing with data, storytelling.' },

  // ── Design ─────────────────────────────────────────────────────
  { id: 'design.ux-research', track: 'design', label: 'UX Research', hint: 'Methods, biases, sample design.' },
  { id: 'design.systems', track: 'design', label: 'Design Systems', hint: 'Tokens, components, governance.' },
  { id: 'design.portfolio', track: 'design', label: 'Portfolio Walk-through', hint: 'Frame, decisions, trade-offs.' },
  { id: 'design.behavioral', track: 'design', label: 'Behavioral / Fit', hint: 'Working with PM/eng, taste, conflict.' },

  // ── General (cross-track) ──────────────────────────────────────
  { id: 'general.star-stories', track: 'general', label: 'STAR Stories', hint: 'Failure, leadership, impact, conflict.' },
  { id: 'general.motivation', track: 'general', label: 'Motivation', hint: 'Why this firm / role / sector.' },
  { id: 'general.career-arc', track: 'general', label: 'Career Arc', hint: 'Walk me through your CV, transitions.' },
  { id: 'general.strengths-weaknesses', track: 'general', label: 'Strengths & Weaknesses', hint: 'Self-awareness, growth signals.' },
];

export function topicsForTrack(track: QuestionTrack): TopicMeta[] {
  return TOPICS.filter((t) => t.track === track);
}

export function getTopic(id: string): TopicMeta | undefined {
  return TOPICS.find((t) => t.id === id);
}
