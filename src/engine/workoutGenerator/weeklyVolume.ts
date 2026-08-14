import { exerciseById } from '../../catalog/exercises';
import { muscleById } from '../../catalog/muscles';
import { muscleIds, type MuscleId } from '../../catalog/schema';
import type { Profile } from '../../domain/models';
import type {
  RecentMuscleExposure,
  WeeklyVolume,
  WorkoutBlock,
} from './schema';

export type MusclePriority = {
  muscle: MuscleId;
  targetSets: number;
  completedSets: number;
  deficitSets: number;
  recoveryRemaining: number;
  score: number;
};

const baseTargets: WeeklyVolume = {
  chest: 10,
  'upper-chest': 6,
  'front-delts': 6,
  'side-delts': 8,
  'rear-delts': 8,
  triceps: 8,
  biceps: 8,
  brachialis: 5,
  forearms: 4,
  lats: 10,
  'upper-back': 10,
  traps: 5,
  'spinal-erectors': 5,
  quads: 10,
  hamstrings: 8,
  glutes: 8,
  calves: 6,
  abs: 6,
  obliques: 4,
};

function goalBoosts(profile: Profile): WeeklyVolume {
  const boosts: WeeklyVolume = {};
  if (profile.primaryGoal === 'Build Muscle') {
    muscleIds.forEach((muscle) => {
      boosts[muscle] = (boosts[muscle] ?? 0) + 2;
    });
  }
  if (profile.primaryGoal === 'Build Strength') {
    ['chest', 'lats', 'upper-back', 'quads', 'hamstrings', 'glutes'].forEach(
      (muscle) => {
        boosts[muscle as MuscleId] = (boosts[muscle as MuscleId] ?? 0) + 2;
      },
    );
  }
  if (profile.secondaryGoal === 'Bigger Arms') {
    boosts.biceps = (boosts.biceps ?? 0) + 5;
    boosts.triceps = (boosts.triceps ?? 0) + 5;
    boosts.brachialis = (boosts.brachialis ?? 0) + 3;
  }
  if (profile.secondaryGoal === 'Bigger Chest') {
    boosts.chest = (boosts.chest ?? 0) + 5;
    boosts['upper-chest'] = (boosts['upper-chest'] ?? 0) + 4;
  }
  if (profile.secondaryGoal === 'More Overall Size') {
    muscleIds.forEach((muscle) => {
      boosts[muscle] = (boosts[muscle] ?? 0) + 1;
    });
  }
  return boosts;
}

export function weeklyVolumeTargets(profile: Profile): WeeklyVolume {
  const boosts = goalBoosts(profile);
  const frequencyScale = profile.weeklyFrequency <= 2 ? 0.75 : 1;
  return Object.fromEntries(
    muscleIds.map((muscle) => [
      muscle,
      Math.round(
        ((baseTargets[muscle] ?? 6) + (boosts[muscle] ?? 0)) * frequencyScale,
      ),
    ]),
  ) as WeeklyVolume;
}

function recoveryRemaining(
  muscle: MuscleId,
  exposures: RecentMuscleExposure[],
  now: Date,
): number {
  const recoveryHours = muscleById.get(muscle)?.typicalRecoveryHours ?? 48;
  const latest = exposures
    .filter((exposure) => exposure.muscle === muscle)
    .map((exposure) => ({
      ...exposure,
      ageHours: Math.max(
        0,
        (now.getTime() - new Date(exposure.trainedAt).getTime()) / 3_600_000,
      ),
    }))
    .sort((first, second) => first.ageHours - second.ageHours)[0];
  if (!latest || latest.ageHours >= recoveryHours) return 0;
  const hardSetFactor = Math.min(1, latest.hardSets / 8);
  return Math.round(
    ((recoveryHours - latest.ageHours) / recoveryHours) * hardSetFactor * 100,
  );
}

export function rankMusclePriorities(args: {
  profile: Profile;
  currentWeeklyVolume: WeeklyVolume;
  recentExposure: RecentMuscleExposure[];
  now: Date;
}): MusclePriority[] {
  const targets = weeklyVolumeTargets(args.profile);
  return muscleIds
    .map((muscle) => {
      const targetSets = targets[muscle] ?? 6;
      const completedSets = args.currentWeeklyVolume[muscle] ?? 0;
      const deficitSets = Math.max(0, targetSets - completedSets);
      const remaining = recoveryRemaining(
        muscle,
        args.recentExposure,
        args.now,
      );
      return {
        muscle,
        targetSets,
        completedSets,
        deficitSets,
        recoveryRemaining: remaining,
        score: Math.round(
          (deficitSets / targetSets) * 100 + deficitSets * 2 - remaining,
        ),
      };
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.deficitSets - first.deficitSets ||
        first.muscle.localeCompare(second.muscle),
    );
}

function addPrescriptionVolume(
  volume: WeeklyVolume,
  exerciseId: string,
  sets: number,
) {
  const exercise = exerciseById.get(exerciseId);
  if (!exercise) return;
  exercise.primaryMuscles.forEach((muscle) => {
    volume[muscle] = (volume[muscle] ?? 0) + sets;
  });
  exercise.secondaryMuscles.forEach((muscle) => {
    volume[muscle] = (volume[muscle] ?? 0) + sets * 0.5;
  });
}

export function calculatePlannedVolume(blocks: WorkoutBlock[]): WeeklyVolume {
  const volume: WeeklyVolume = {};
  blocks.forEach((block) => {
    const prescriptions =
      block.kind === 'exercise' ? [block.prescription] : block.moves;
    prescriptions.forEach((prescription) => {
      // Optional intensity techniques are reported separately. They must not
      // inflate the base weekly-volume plan used by future recommendations.
      addPrescriptionVolume(volume, prescription.exerciseId, prescription.sets);
    });
  });
  return volume;
}
