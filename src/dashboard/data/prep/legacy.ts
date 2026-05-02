// Mock data for the Prep page — all static, no backend.

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface PrepQuestion {
  id: string;
  index: number;
  question: string;
  difficulty: Difficulty;
  framework: string;
  practiceScore: number;
}

export const mockPrepQuestions: PrepQuestion[] = [
  { id: "q1", index: 1, question: "Tell me about a time you led under pressure.", difficulty: "Medium", framework: "STAR", practiceScore: 8.6 },
  { id: "q2", index: 2, question: "Describe a failed project and what you learned.", difficulty: "Hard", framework: "STAR", practiceScore: 7.1 },
  { id: "q3", index: 3, question: "Why Goldman Sachs?", difficulty: "Easy", framework: "Motivation", practiceScore: 8.9 },
  { id: "q4", index: 4, question: "Walk me through a recent deal you worked on.", difficulty: "Medium", framework: "Pyramid", practiceScore: 7.8 },
  { id: "q5", index: 5, question: "How do you prioritize when everything is urgent?", difficulty: "Medium", framework: "STAR", practiceScore: 8.0 },
  { id: "q6", index: 6, question: "Value this acquisition target in 3 minutes.", difficulty: "Hard", framework: "MECE", practiceScore: 6.9 },
];

export type DrillCategory = "Technical" | "Behavioral" | "Case";

export interface DrillData {
  id: string;
  title: string;
  category: DrillCategory;
  questions: number;
  minutes: number;
}

export const mockDrills: DrillData[] = [
  { id: "d1", title: "DCF Modeling", category: "Technical", questions: 12, minutes: 25 },
  { id: "d2", title: "Leadership Stories", category: "Behavioral", questions: 15, minutes: 30 },
  { id: "d3", title: "Merger Case", category: "Case", questions: 8, minutes: 40 },
];

export interface ChatMessage {
  id: string;
  from: "ai" | "user";
  text: string;
  timestamp: string;
}

export interface ScoreItem {
  label: string;
  value: number;
}

export const mockMockInterview = {
  status: "Live" as const,
  conversation: [
    { id: "m1", from: "ai", text: "Walk me through a recent deal you worked on.", timestamp: "00:02" },
    {
      id: "m2",
      from: "user",
      text: "Sure. I worked on the sale of a software business to a strategic buyer. Our team ran the full process from CIM to close. I led the financial model and buyer outreach, which helped us achieve a 22% premium to the initial valuation.",
      timestamp: "00:28",
    },
  ] satisfies ChatMessage[],
  scores: [
    { label: "Structure", value: 8.2 },
    { label: "Conciseness", value: 7.6 },
    { label: "Evidence", value: 8.8 },
    { label: "Memorability", value: 7.9 },
  ] satisfies ScoreItem[],
  feedback: [
    "Lead with deal context (size, sector, your role).",
    "Quantify your impact (outreach volume, buyers engaged).",
    "Tighten the first 20 seconds to hook the interviewer.",
  ],
};

export interface WeekPoint {
  label: string;
  value: number;
}

export type WeakAreaColor = "red" | "orange";

export interface WeakArea {
  label: string;
  color: WeakAreaColor;
}

export const mockProgress = {
  questionsPracticed: { value: 37, trend: "12 from last week" },
  averageScore: { value: 7.9, max: 10, trend: "0.8 from last week" },
  completion: 62,
  weeks: [
    { label: "Wk 1", value: 1.5 },
    { label: "Wk 2", value: 3.2 },
    { label: "Wk 3", value: 4.5 },
    { label: "Wk 4", value: 5.5 },
    { label: "Wk 5", value: 6.0 },
    { label: "Wk 6", value: 6.4 },
    { label: "Wk 7", value: 7.0 },
    { label: "Wk 8", value: 7.8 },
  ] satisfies WeekPoint[],
  weakAreas: [
    { label: "Technical", color: "red" },
    { label: "Case interviews", color: "orange" },
  ] satisfies WeakArea[],
};

export interface PlanTaskData {
  id: string;
  title: string;
  duration: string;
  done: boolean;
}

export const mockTodaysPlan: PlanTaskData[] = [
  { id: "t1", title: "Review 12 behavioral questions", duration: "20 min", done: true },
  { id: "t2", title: "Run 1 mock interview", duration: "40 min", done: false },
  { id: "t3", title: "Revise 90-second pitch", duration: "15 min", done: false },
  { id: "t4", title: "Review Goldman notes", duration: "20 min", done: false },
];

export type InsightStatus = "good" | "warning" | "bad";

export interface AIInsightData {
  id: string;
  status: InsightStatus;
  text: string;
}

export const mockAIInsights: AIInsightData[] = [
  { id: "i1", status: "good", text: "Behavioral answers improved +18% over 4 weeks" },
  { id: "i2", status: "warning", text: "Technical precision still inconsistent" },
  { id: "i3", status: "bad", text: "Your opening answers are too long by ~12 seconds" },
];
