export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'chat';

export interface JournalTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: ReflectionMode;
  modelUsed?: string;
}

export interface ActionInsights {
  mainTheme: string;
  keyInsight: string;
  nextAction: string;
  reflectionQuestion: string;
  generatedAt?: string;
  modelUsed?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  tags?: string[];
  reflectionQuestion?: string;
  actionInsights?: ActionInsights | null;
  turns: JournalTurn[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
