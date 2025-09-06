// src/types/dailyReview.ts
export interface DailyReview {
  id: string;
  userId: string;
  date: Date;
  overallRating: number; // 1-10 scale
  
  // Performance categories (1-10 scale)
  ratings: {
    discipline: number;        // Stuck to trading plan
    riskManagement: number;    // Proper position sizing and stop losses
    entryTiming: number;       // Quality of trade entries
    exitTiming: number;        // Quality of trade exits
    emotionalControl: number;  // Managed emotions well
    marketReading: number;     // Read market conditions correctly
  };
  
  // Automated metrics (calculated from trades)
  metrics: {
    totalPL: number;
    winRate: number;
    tradeCount: number;
    largestWin: number;
    largestLoss: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
  };
  
  // User notes and reflections
  notes: {
    whatWorked: string;        // What went well today
    whatDidntWork: string;     // What needs improvement
    lessonsLearned: string;    // Key takeaways
    marketConditions: string;  // Market environment notes
    generalNotes: string;      // Free-form daily notes
  };
  
  // Reminders and goals
  reminders: {
    tomorrowGoals: string[];   // Goals for next trading day
    watchList: string[];       // Tickers to watch
    strategies: string[];      // Strategies to focus on
    reminders: string[];       // General reminders
  };
  
  // Mood and psychology
  psychology: {
    preMarketMood: number;     // 1-10 how you felt before market
    postMarketMood: number;    // 1-10 how you felt after market
    stressLevel: number;       // 1-10 stress during trading
    confidenceLevel: number;   // 1-10 confidence in decisions
    energyLevel: number;       // 1-10 energy/focus level
  };
  
  // Tags for categorization
  tags: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isComplete: boolean; // Whether user has filled out the review
}

export interface DailyReviewSummary {
  date: Date;
  overallRating: number;
  totalPL: number;
  tradeCount: number;
  hasReview: boolean;
  tags: string[];
}

export type ReviewCategory = keyof DailyReview['ratings'];
export type PsychologyCategory = keyof DailyReview['psychology'];

export interface RatingConfig {
  category: ReviewCategory | PsychologyCategory;
  label: string;
  description: string;
  icon: string;
}

export const RATING_CATEGORIES: RatingConfig[] = [
  {
    category: 'discipline',
    label: 'Discipline',
    description: 'Followed trading plan and rules',
    icon: '🎯'
  },
  {
    category: 'riskManagement',
    label: 'Risk Management',
    description: 'Proper position sizing and stop losses',
    icon: '🛡️'
  },
  {
    category: 'entryTiming',
    label: 'Entry Timing',
    description: 'Quality of trade entry points',
    icon: '🎪'
  },
  {
    category: 'exitTiming',
    label: 'Exit Timing',
    description: 'Quality of trade exit decisions',
    icon: '🚪'
  },
  {
    category: 'emotionalControl',
    label: 'Emotional Control',
    description: 'Managed emotions and avoided revenge trading',
    icon: '🧘'
  },
  {
    category: 'marketReading',
    label: 'Market Reading',
    description: 'Correctly interpreted market conditions',
    icon: '📊'
  }
];

export const PSYCHOLOGY_CATEGORIES: RatingConfig[] = [
  {
    category: 'preMarketMood',
    label: 'Pre-Market Mood',
    description: 'How you felt before trading',
    icon: '🌅'
  },
  {
    category: 'postMarketMood',
    label: 'Post-Market Mood',
    description: 'How you felt after trading',
    icon: '🌆'
  },
  {
    category: 'stressLevel',
    label: 'Stress Level',
    description: 'Stress experienced during trading',
    icon: '😰'
  },
  {
    category: 'confidenceLevel',
    label: 'Confidence',
    description: 'Confidence in trading decisions',
    icon: '💪'
  },
  {
    category: 'energyLevel',
    label: 'Energy Level',
    description: 'Focus and energy throughout the day',
    icon: '⚡'
  }
];

export const COMMON_TAGS = [
  'Trending Market',
  'Choppy Market', 
  'High Volume',
  'Low Volume',
  'News Driven',
  'Technical Analysis',
  'Scalping',
  'Swing Trading',
  'Earnings Season',
  'FOMC Day',
  'Options Expiration',
  'Holiday Trading',
  'Pre-Market Strong',
  'After Hours',
  'Range Bound',
  'Breakout Day',
  'Reversal Day',
  'Gap Up',
  'Gap Down',
  'Volatile'
];