export const topics = [
  { id: "space", label: "Space", description: "Missions, planets & discovery", color: "lavender" },
  { id: "nature", label: "Animals & nature", description: "Wildlife, habitats & growing", color: "sage" },
  { id: "music", label: "Music", description: "Playlists, rhythm & sound", color: "peach" },
  { id: "games", label: "Games & building", description: "Worlds, puzzles & design", color: "blue" },
  { id: "art", label: "Art & making", description: "Drawing, color & creating", color: "rose" },
  { id: "everyday", label: "Everyday life", description: "Food, plans & getting around", color: "sand" },
] as const;
export type Topic = typeof topics[number]["id"];
export type Question = { prompt: string; options: string[]; correct: number; hint: string; explanation: string };
export type Activity = { id: string; title: string; description: string; topic: Topic; subject: "Math" | "Reading" | "Science" | "Life skills"; level: string; reading: string; questions: Question[]; active: boolean; updatedAt?: string };
export type PairChoice = { left: Topic; right: Topic; choice: string };
export type Preferences = { interests: Topic[]; pairs: PairChoice[]; format: "steps" | "passage"; updatedAt?: string };
export type BoardItem = { activityId?: string; title: string };
export type Board = { first: BoardItem; then: BoardItem; stage: "first" | "then" | "done"; goalSeconds: number; rewardSeconds: number; workElapsed: number; rewardElapsed: number; trigger: "time" | "activity"; updatedAt?: string; completedAt?: string; completionSource?: string };
export type Learner = { id: string; name: string; color: string; preferences: Preferences; board: Board; assignments: string[]; note: string };
export type Answer = { attempts: number[]; skipped: boolean; finished: boolean };
export type Session = { id: string; learnerId: string; activity: Activity; startedAt: string; completedAt?: string; answers: Answer[]; index: number; rating?: "yes" | "maybe" | "no" };
export type Classroom = { learners: Learner[]; activities: Activity[]; sessions: Session[] };
export type Snapshot = { state: Classroom; revision: number; updatedAt: string };
export function topicLabel(id: string) { return topics.find(t => t.id === id)?.label ?? id; }
export function preferenceScore(activity: Activity, learner: Learner) {
  let score = learner.preferences.interests.includes(activity.topic) ? 4 : 0;
  for (const p of learner.preferences.pairs) {
    if (p.choice === activity.topic) score += 2;
    if (p.choice === "both" && [p.left, p.right].includes(activity.topic)) score += 1;
  }
  return score;
}
export function rankedActivities(state: Classroom, learner: Learner) {
  return state.activities.filter(a => a.active).sort((a,b) => preferenceScore(b,learner)-preferenceScore(a,learner));
}
export function sessionSummary(s: Session) {
  return { firstCorrect: s.answers.filter((a,i)=>a.attempts[0]===s.activity.questions[i].correct).length, answered: s.answers.filter(a=>a.attempts.length>0).length, skipped: s.answers.filter(a=>a.skipped).length, total:s.activity.questions.length };
}
