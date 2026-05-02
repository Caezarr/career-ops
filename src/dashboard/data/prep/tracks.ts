/**
 * Track-level taxonomy for the prep question bank.
 *
 * A "track" is the macro-category a candidate identifies with —
 * finance vs consulting vs SWE etc. Every question belongs to exactly
 * one track. Topics live one level below (DCF, LBO, derivatives, …
 * within finance). The schema is locked so the bank can grow from
 * 50 → 50,000 questions without breaking call sites.
 *
 * The icon + accentColor are display hints used by the UI to colour
 * each track tab. The accentColor maps to existing CSS tokens so the
 * dashboard's design system stays in charge of palette decisions.
 */

import type { QuestionTrack } from '../../store/types';

export interface TrackMeta {
  id: QuestionTrack;
  label: string;
  shortLabel: string;
  /** One-line description displayed under the track tab. */
  description: string;
  /** Inspirations / canonical sources we model the bank after.
   *  Surface this as a footnote on the track page so the user
   *  understands what kind of questions to expect. */
  inspirations: string[];
  /** Suggested order in the track tab strip. */
  order: number;
}

export const TRACKS: TrackMeta[] = [
  {
    id: 'finance',
    label: 'Finance',
    shortLabel: 'Finance',
    description: 'IBD · M&A · PE · markets · derivatives — quantitative + behavioural.',
    inspirations: ['John Hull (Options & Derivatives)', 'Bouzouba (FR finance prep)', 'WSO interview guides'],
    order: 1,
  },
  {
    id: 'consulting',
    label: 'Strategy & Consulting',
    shortLabel: 'Consulting',
    description: 'Cases · market sizing · profitability · M&A advisory · structured thinking.',
    inspirations: ['McKinsey case archive', 'BCG cases', 'Bain', 'Case in Point', 'Victor Cheng'],
    order: 2,
  },
  {
    id: 'product',
    label: 'Product',
    shortLabel: 'Product',
    description: 'PM frameworks · metrics · product sense · strategy · estimation.',
    inspirations: ['Decode and Conquer', 'Cracking the PM Interview', 'Lewis Lin', 'Stellar Peers'],
    order: 3,
  },
  {
    id: 'swe',
    label: 'Software Engineering',
    shortLabel: 'SWE',
    description: 'Coding · data structures · algorithms · system design · CS fundamentals.',
    inspirations: ['LeetCode', 'NeetCode', 'Cracking the Coding Interview', 'Designing Data-Intensive Applications'],
    order: 4,
  },
  {
    id: 'ai',
    label: 'AI / ML',
    shortLabel: 'AI / ML',
    description: 'ML fundamentals · deep learning · LLMs · agents · MLOps · production AI.',
    inspirations: ['Chip Huyen (ML Interviews)', '100 Days of ML', 'Hugging Face cookbook', 'Andrej Karpathy talks'],
    order: 5,
  },
  {
    id: 'data',
    label: 'Data',
    shortLabel: 'Data',
    description: 'Analytics · SQL · stats · A/B tests · BI · data engineering.',
    inspirations: ['Ace the Data Science Interview', 'Mode SQL tutorials', 'Trustworthy Online Experiments'],
    order: 6,
  },
  {
    id: 'design',
    label: 'Design',
    shortLabel: 'Design',
    description: 'UX research · design systems · portfolio review · interaction.',
    inspirations: ['Adam Wathan portfolio reviews', 'Design Better podcast', 'Don Norman'],
    order: 7,
  },
  {
    id: 'general',
    label: 'Behavioral & Fit',
    shortLabel: 'General',
    description: 'STAR stories · culture fit · motivation · weaknesses — relevant to every track.',
    inspirations: ['Amazon leadership principles', 'Google g-rate', 'Behavioral STAR canon'],
    order: 8,
  },
];

export function getTrack(id: QuestionTrack): TrackMeta | undefined {
  return TRACKS.find((t) => t.id === id);
}
