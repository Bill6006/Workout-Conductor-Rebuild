import type { MuscleId } from '../../catalog/schema';

export type Confidence = 'high' | 'medium' | 'low';

export type PersonalRecordKind =
  'weight' | 'reps-at-weight' | 'volume' | 'top-range';

export type PersonalRecord = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  kind: PersonalRecordKind;
  label: string;
  detail: string;
  achievedAt: string;
  sessionId: string;
};

export type MuscleCoverage = {
  muscle: MuscleId;
  name: string;
  directSets: number;
  indirectSets: number;
  effectiveSets: number;
  targetMin: number;
  targetMax: number;
  priority: boolean;
};

export type ExerciseProgress = {
  exerciseId: string;
  exerciseName: string;
  sessionCount: number;
  workingSets: number;
  totalVolume: number;
  estimatedStrength: number | null;
  strengthChangePercent: number | null;
  prCount: number;
  latestAt: string;
  note: string | null;
};

export type ProgressAnalytics = {
  completedSessions: number;
  fourWeekSessions: number;
  consistencyPercent: number;
  averageDurationMinutes: number;
  durationEfficiencyPercent: number;
  workingSetsPerMinute: number;
  totalWorkingVolume: number;
  coverage: MuscleCoverage[];
  personalRecords: PersonalRecord[];
  exercises: ExerciseProgress[];
  confidence: Confidence;
  sampleLabel: string;
  evidence: string[];
};

export type SessionSummary = {
  completedSets: number;
  exercises: number;
  volume: number;
  durationMinutes: number;
  personalRecords: PersonalRecord[];
  musclesTrained: MuscleCoverage[];
  recoveryNote: string;
  substitutions: number;
  omittedExercises: string[];
  nextTargets: string[];
  nextFocus: string;
  confidence: Confidence;
  sampleLabel: string;
};
