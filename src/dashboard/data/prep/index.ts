/**
 * Aggregated re-exports for the prep data layer. Consumers should
 * import from here rather than reaching into individual files —
 * keeps a single migration point when we move questions / topics
 * to the Tauri SQLite back-end.
 */

// V2 bank — tracks, topics, seed questions.
export { TRACKS, getTrack, type TrackMeta } from './tracks';
export { TOPICS, topicsForTrack, getTopic, type TopicMeta } from './topics';
export { SEED_QUESTIONS } from './questions';

// Legacy mock data — still consumed by older Prep components
// (DrillCard, MockInterview, ProgressCard, …) until they migrate to
// the V2 bank. The re-exports keep `import { … } from '../../data/prep'`
// working without touching every call site.
export {
  mockPrepQuestions,
  mockDrills,
  mockMockInterview,
  mockProgress,
  mockTodaysPlan,
  mockAIInsights,
  type Difficulty,
  type DrillData,
  type DrillCategory,
  type WeakArea,
  type WeakAreaColor,
  type WeekPoint,
  type ChatMessage,
  type ScoreItem,
  type PlanTaskData,
  type PrepQuestion as PrepQuestionLegacy,
  type AIInsightData,
  type InsightStatus,
} from './legacy';
