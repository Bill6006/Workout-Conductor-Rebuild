import { exerciseById } from '../../catalog/exercises';
import { muscleById } from '../../catalog/muscles';
import { movementPatternById } from '../../catalog/movementPatterns';
import type { Exercise, MuscleId } from '../../catalog/schema';
import type { AppBundle, AppSettings, Profile } from '../../domain/models';
import { validateExerciseSelection } from '../conflicts/validateConflicts';
import {
  resolveTrainingLocation,
  type ResolvedTrainingLocation,
} from './equipmentAdapter';
import {
  generatedWorkoutSchema,
  type ExercisePrescription,
  type GeneratedWorkout,
  type RecentMuscleExposure,
  type WeeklyVolume,
  type WorkoutBlock,
  type WorkoutDuration,
} from './schema';
import {
  generationConflictContext,
  rankExercises,
  type ScoredExercise,
} from './scoreExercises';
import { estimateWorkoutTime, targetSecondsForDuration } from './timeEstimator';
import {
  calculatePlannedVolume,
  rankMusclePriorities,
  type MusclePriority,
} from './weeklyVolume';

export type WorkoutGenerationInput = {
  profile: Profile;
  settings: AppSettings;
  location: ResolvedTrainingLocation;
  duration: WorkoutDuration;
  date: string;
  workoutPosition: number;
  currentWeeklyVolume: WeeklyVolume;
  recentExposure: RecentMuscleExposure[];
  previousExerciseIds: string[];
  readiness: 'ready' | 'moderate' | 'low';
  painFlags: string[];
};

export const workoutDurationOptions: Array<{
  value: WorkoutDuration;
  label: (defaultMinutes: number) => string;
}> = [
  { value: '15', label: () => '15 minutes' },
  { value: '30', label: () => '30 minutes' },
  { value: '45', label: () => '45 minutes' },
  {
    value: 'default',
    label: (defaultMinutes) => `Default time · ${defaultMinutes} min`,
  },
];

function generationProfile(input: WorkoutGenerationInput): Profile {
  if (input.painFlags.length === 0) return input.profile;
  return {
    ...input.profile,
    limitations: Array.from(
      new Set([...input.profile.limitations, ...input.painFlags]),
    ),
  };
}

function selectExercise(
  ranked: ScoredExercise[],
  exclude: Set<string>,
  predicate?: (exercise: Exercise) => boolean,
): Exercise | null {
  return (
    ranked.find(
      ({ exercise }) =>
        !exclude.has(exercise.id) && (predicate?.(exercise) ?? true),
    )?.exercise ?? null
  );
}

function roleForExercise(
  exercise: Exercise,
  preferred: ExercisePrescription['progressionRole'],
): ExercisePrescription['progressionRole'] {
  if (preferred === 'strength-anchor') return preferred;
  if (
    exercise.trainingRole === 'specialization' ||
    exercise.trainingRole === 'isolation'
  ) {
    return 'specialization';
  }
  if (exercise.trainingRole === 'corrective') return 'support';
  return preferred;
}

function restSeconds(
  settings: AppSettings,
  progressionRole: ExercisePrescription['progressionRole'],
) {
  if (progressionRole === 'strength-anchor') {
    if (settings.restStyle === 'Full recovery') return 180;
    if (settings.restStyle === 'Short and efficient') return 90;
    return 120;
  }
  if (settings.restStyle === 'Full recovery') return 105;
  if (settings.restStyle === 'Short and efficient') return 45;
  return 75;
}

function makeWarmups(
  exercise: Exercise,
  isAnchor: boolean,
  compact: boolean,
): ExercisePrescription['warmupSets'] {
  if (!isAnchor || !exercise.warmup.rampEligible) return [];
  const count = compact ? 1 : Math.max(1, exercise.warmup.minimumRampSets);
  return Array.from({ length: count }, (_, index) => ({
    kind:
      index === 0 ? ('movement-rehearsal' as const) : ('load-ramp' as const),
    reps: index === 0 ? 8 : 5,
    loadPercent: index === 0 ? 40 : 65,
    note:
      index === 0
        ? 'Rehearse the path with an easy load.'
        : 'Ramp load without approaching fatigue.',
    countsTowardProgression: false as const,
    countsTowardPr: false as const,
    countsTowardWorkingVolume: false as const,
  }));
}

function makePrescription(args: {
  exercise: Exercise;
  id: string;
  sets: number;
  preferredRole: ExercisePrescription['progressionRole'];
  settings: AppSettings;
  compact?: boolean;
}): ExercisePrescription {
  const progressionRole = roleForExercise(args.exercise, args.preferredRole);
  const isAnchor = progressionRole === 'strength-anchor';
  const repRange = isAnchor
    ? {
        min: Math.min(args.exercise.typicalRepRange.min, 6),
        max: Math.min(args.exercise.typicalRepRange.max, 8),
      }
    : args.exercise.typicalRepRange;
  return {
    prescriptionId: args.id,
    exerciseId: args.exercise.id,
    exerciseName: args.exercise.name,
    catalogRole: args.exercise.trainingRole,
    progressionRole,
    progressionFamily: args.exercise.progressionFamily,
    sets: args.sets,
    repRange,
    loadGuidance: isAnchor
      ? 'Use the last successful progression load when available; otherwise choose a controlled 2-RIR load.'
      : 'Use a repeatable load that keeps every prescribed rep inside the target RIR.',
    targetRir: isAnchor ? 2 : 1,
    restSeconds: restSeconds(args.settings, progressionRole),
    warmupSets: makeWarmups(args.exercise, isAnchor, args.compact ?? false),
    dropSet: null,
    rationale: isAnchor
      ? 'Anchors progression while fatigue is lowest.'
      : `${args.exercise.primaryMuscles.map((muscle) => muscle.replaceAll('-', ' ')).join(' + ')} volume with a progression-stable movement.`,
  };
}

function exerciseBlock(
  blockId: string,
  prescription: ExercisePrescription,
): WorkoutBlock {
  return {
    kind: 'exercise',
    blockId,
    canonicalRow: prescription.exerciseName,
    prescription,
  };
}

function smartSuperset(args: {
  ranked: ScoredExercise[];
  selected: Set<string>;
  input: WorkoutGenerationInput;
  profile: Profile;
  priorities: MusclePriority[];
  rounds: number;
  blockNumber: number;
}): WorkoutBlock | null {
  if (!args.input.settings.allowSupersets) return null;
  const eligible = args.ranked.filter(({ exercise }) => {
    const category = movementPatternById.get(
      exercise.movementPattern,
    )?.category;
    return (
      !args.selected.has(exercise.id) &&
      exercise.trainingRole !== 'primary-strength' &&
      exercise.transitionCost <= 3 &&
      ['arms', 'core', 'push', 'pull'].includes(category ?? '')
    );
  });
  const orderedPairs: Array<[ScoredExercise, ScoredExercise]> = [];
  for (let firstIndex = 0; firstIndex < eligible.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < eligible.length;
      secondIndex += 1
    ) {
      const first = eligible[firstIndex];
      const second = eligible[secondIndex];
      const firstCategory = movementPatternById.get(
        first.exercise.movementPattern,
      )?.category;
      const secondCategory = movementPatternById.get(
        second.exercise.movementPattern,
      )?.category;
      const armOpposition =
        (first.exercise.movementPattern === 'elbow-flexion' &&
          second.exercise.movementPattern === 'elbow-extension') ||
        (first.exercise.movementPattern === 'elbow-extension' &&
          second.exercise.movementPattern === 'elbow-flexion');
      if (armOpposition || firstCategory !== secondCategory) {
        orderedPairs.push([first, second]);
      }
    }
  }
  const armOppositionScore = (pair: [ScoredExercise, ScoredExercise]) => {
    const patterns = pair.map(({ exercise }) => exercise.movementPattern);
    return patterns.includes('elbow-flexion') &&
      patterns.includes('elbow-extension')
      ? 1
      : 0;
  };
  orderedPairs.sort(
    (first, second) =>
      armOppositionScore(second) - armOppositionScore(first) ||
      second[0].score + second[1].score - (first[0].score + first[1].score),
  );

  const context = generationConflictContext({
    profile: args.profile,
    location: args.input.location,
    priorities: args.priorities,
    timeBudgetSeconds: targetSecondsForDuration(
      args.input.duration,
      args.profile.typicalDuration,
    ),
  });
  const pair = orderedPairs.find(([first, second]) => {
    if (
      first.exercise.primaryMuscles.some((muscle) =>
        second.exercise.primaryMuscles.includes(muscle),
      )
    ) {
      return false;
    }
    const validation = validateExerciseSelection(
      [first.exercise.id, second.exercise.id],
      {
        ...context,
        supersetPairs: [
          {
            firstExerciseId: first.exercise.id,
            secondExerciseId: second.exercise.id,
          },
        ],
      },
    );
    return (
      validation.valid &&
      !validation.warnings.some((warning) => warning.type === 'joint-stress')
    );
  });
  if (!pair) return null;

  const moves = pair.map(({ exercise }, index) =>
    makePrescription({
      exercise,
      id: `b${args.blockNumber}-m${index + 1}`,
      sets: args.rounds,
      preferredRole: 'specialization',
      settings: args.input.settings,
    }),
  ) as [ExercisePrescription, ExercisePrescription];
  moves.forEach((move) => args.selected.add(move.exerciseId));
  return {
    kind: 'superset',
    blockId: `block-${args.blockNumber}`,
    canonicalRow: `${moves[0].exerciseName} + ${moves[1].exerciseName}`,
    moves,
    rounds: args.rounds,
    restAfterRoundSeconds:
      args.input.settings.restStyle === 'Short and efficient' ? 45 : 60,
  };
}

function generalFitnessCircuit(args: {
  ranked: ScoredExercise[];
  input: WorkoutGenerationInput;
  rounds: number;
}): Extract<WorkoutBlock, { kind: 'circuit' }> | null {
  const categories = ['push', 'lower', 'core'] as const;
  const selected: Exercise[] = [];
  categories.forEach((category) => {
    const candidate = args.ranked.find(({ exercise }) => {
      return (
        !selected.some((item) => item.id === exercise.id) &&
        exercise.trainingRole !== 'primary-strength' &&
        exercise.transitionCost <= 3 &&
        movementPatternById.get(exercise.movementPattern)?.category === category
      );
    });
    if (candidate) selected.push(candidate.exercise);
  });
  if (selected.length < 2) return null;
  const moves = selected.map((exercise, index) =>
    makePrescription({
      exercise,
      id: `b1-m${index + 1}`,
      sets: args.rounds,
      preferredRole:
        exercise.trainingRole === 'corrective'
          ? 'support'
          : 'hypertrophy-builder',
      settings: args.input.settings,
    }),
  );
  return {
    kind: 'circuit',
    blockId: 'block-1',
    canonicalRow: moves.map((move) => move.exerciseName).join(' → '),
    moves,
    rounds: args.rounds,
    restAfterRoundSeconds: 60,
  };
}

function applyDropSet(
  blocks: WorkoutBlock[],
  input: WorkoutGenerationInput,
): WorkoutBlock[] {
  if (
    !input.settings.allowDropSets ||
    input.profile.primaryGoal !== 'Build Muscle'
  ) {
    return blocks;
  }
  for (let blockIndex = blocks.length - 1; blockIndex >= 0; blockIndex -= 1) {
    const block = blocks[blockIndex];
    if (block.kind === 'circuit') continue;
    const prescriptions =
      block.kind === 'exercise' ? [block.prescription] : [...block.moves];
    for (
      let moveIndex = prescriptions.length - 1;
      moveIndex >= 0;
      moveIndex -= 1
    ) {
      const prescription = prescriptions[moveIndex];
      const exercise = exerciseById.get(prescription.exerciseId);
      if (
        exercise?.dropSet.support === 'safe' &&
        ['specialization', 'hypertrophy-builder'].includes(
          prescription.progressionRole,
        )
      ) {
        const updated = {
          ...prescription,
          dropSet: {
            reps: 'Continue with clean reps to 1 RIR',
            loadReductionPercent: 25,
            rationale:
              'A stable final exercise adds hypertrophy volume without affecting later priority work.',
          },
        };
        if (block.kind === 'exercise') {
          blocks[blockIndex] = { ...block, prescription: updated };
        } else {
          const moves = [...block.moves] as [
            ExercisePrescription,
            ExercisePrescription,
          ];
          moves[moveIndex] = updated;
          blocks[blockIndex] = { ...block, moves };
        }
        return blocks;
      }
    }
  }
  return blocks;
}

function trimToBudget(
  blocks: WorkoutBlock[],
  targetSeconds: number,
): WorkoutBlock[] {
  while (estimateWorkoutTime(blocks).totalSeconds > targetSeconds + 45) {
    let changed = false;
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const block = blocks[index];
      if (block.kind === 'circuit') continue;
      if (block.kind === 'exercise' && block.prescription.dropSet) {
        blocks[index] = {
          ...block,
          prescription: { ...block.prescription, dropSet: null },
        };
        changed = true;
        break;
      }
      if (block.kind === 'superset') {
        const dropIndex = block.moves.findIndex((move) => move.dropSet);
        if (dropIndex >= 0) {
          const moves = [...block.moves] as [
            ExercisePrescription,
            ExercisePrescription,
          ];
          moves[dropIndex] = { ...moves[dropIndex], dropSet: null };
          blocks[index] = { ...block, moves };
          changed = true;
          break;
        }
      }
    }
    if (changed) continue;
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const block = blocks[index];
      if (block.kind === 'exercise' && block.prescription.sets > 2) {
        blocks[index] = {
          ...block,
          prescription: {
            ...block.prescription,
            sets: block.prescription.sets - 1,
          },
        };
        changed = true;
        break;
      }
      if (block.kind !== 'exercise' && block.rounds > 2) {
        const rounds = block.rounds - 1;
        blocks[index] = {
          ...block,
          rounds,
          moves: block.moves.map((move) => ({ ...move, sets: rounds })),
        } as WorkoutBlock;
        changed = true;
        break;
      }
    }
    if (changed) continue;
    if (blocks.length > 2) {
      blocks.pop();
      continue;
    }
    break;
  }
  return blocks;
}

function muscleName(muscle: MuscleId) {
  return muscleById.get(muscle)?.name ?? muscle.replaceAll('-', ' ');
}

export function generateWorkout(
  sourceInput: WorkoutGenerationInput,
): GeneratedWorkout {
  const profile = generationProfile(sourceInput);
  const input = { ...sourceInput, profile };
  const targetSeconds = targetSecondsForDuration(
    input.duration,
    profile.typicalDuration,
  );
  const priorities = rankMusclePriorities({
    profile,
    currentWeeklyVolume: input.currentWeeklyVolume,
    recentExposure: input.recentExposure,
    now: new Date(input.date),
  });
  const ranked = rankExercises({
    profile,
    location: input.location,
    priorities,
    timeBudgetSeconds: targetSeconds,
    continuityExerciseIds: input.previousExerciseIds,
  });
  if (ranked.length === 0) {
    throw new Error('No exercises match the selected location and guardrails.');
  }

  let blocks: WorkoutBlock[] = [];
  const isCircuitSession =
    input.settings.allowCircuits &&
    profile.primaryGoal === 'General Fitness' &&
    (input.duration === '15' || input.duration === '30');
  if (isCircuitSession) {
    const circuit = generalFitnessCircuit({
      ranked,
      input,
      rounds: input.duration === '15' ? 3 : 4,
    });
    if (circuit) blocks.push(circuit);
    if (input.duration === '30') {
      const used = new Set(circuit?.moves.map((move) => move.exerciseId) ?? []);
      const support = selectExercise(ranked, used, (exercise) =>
        ['pull', 'arms'].includes(
          movementPatternById.get(exercise.movementPattern)?.category ?? '',
        ),
      );
      if (support) {
        blocks.push(
          exerciseBlock(
            'block-2',
            makePrescription({
              exercise: support,
              id: 'b2-m1',
              sets: 3,
              preferredRole: 'hypertrophy-builder',
              settings: input.settings,
            }),
          ),
        );
      }
    }
  } else {
    const selected = new Set<string>();
    const mainMuscles: MuscleId[] =
      profile.secondaryGoal === 'Bigger Chest'
        ? ['chest', 'upper-chest']
        : profile.secondaryGoal === 'Bigger Arms'
          ? ['chest', 'lats', 'upper-back']
          : profile.primaryGoal === 'Build Strength'
            ? ['quads', 'chest', 'lats', 'upper-back']
            : priorities.slice(0, 6).map((priority) => priority.muscle);
    const main =
      selectExercise(
        ranked,
        selected,
        (exercise) =>
          exercise.primaryMuscles.some((muscle) =>
            mainMuscles.includes(muscle),
          ) &&
          exercise.mechanics === 'compound' &&
          [
            'primary-strength',
            'primary-hypertrophy',
            'secondary-strength',
          ].includes(exercise.trainingRole),
      ) ?? ranked[0].exercise;
    selected.add(main.id);
    const mainCategory = movementPatternById.get(
      main.movementPattern,
    )?.category;
    const supportCategory = mainCategory === 'push' ? 'pull' : 'push';
    const support = selectExercise(
      ranked,
      selected,
      (exercise) =>
        movementPatternById.get(exercise.movementPattern)?.category ===
        supportCategory,
    );
    if (support) selected.add(support.id);
    const lower = selectExercise(ranked, selected, (exercise) =>
      ['squat', 'lunge', 'hinge', 'knee-flexion'].includes(
        exercise.movementPattern,
      ),
    );
    if (lower) selected.add(lower.id);
    const secondaryPress = selectExercise(ranked, selected, (exercise) =>
      ['horizontal-press', 'incline-press', 'vertical-press'].includes(
        exercise.movementPattern,
      ),
    );

    const structure =
      input.duration === '15'
        ? { main: 2, support: 0, lower: 0, press: 0, superset: 2, core: 0 }
        : input.duration === '30'
          ? { main: 3, support: 3, lower: 0, press: 0, superset: 2, core: 0 }
          : input.duration === '45'
            ? { main: 4, support: 3, lower: 3, press: 0, superset: 3, core: 0 }
            : { main: 4, support: 4, lower: 3, press: 3, superset: 3, core: 2 };
    blocks.push(
      exerciseBlock(
        'block-1',
        makePrescription({
          exercise: main,
          id: 'b1-m1',
          sets: structure.main,
          preferredRole: 'strength-anchor',
          settings: input.settings,
          compact: targetSeconds <= 15 * 60,
        }),
      ),
    );
    if (structure.support && support) {
      blocks.push(
        exerciseBlock(
          `block-${blocks.length + 1}`,
          makePrescription({
            exercise: support,
            id: `b${blocks.length + 1}-m1`,
            sets: structure.support,
            preferredRole: 'hypertrophy-builder',
            settings: input.settings,
          }),
        ),
      );
    }
    if (structure.lower && lower) {
      blocks.push(
        exerciseBlock(
          `block-${blocks.length + 1}`,
          makePrescription({
            exercise: lower,
            id: `b${blocks.length + 1}-m1`,
            sets: structure.lower,
            preferredRole: 'hypertrophy-builder',
            settings: input.settings,
          }),
        ),
      );
    }
    if (structure.press && secondaryPress) {
      selected.add(secondaryPress.id);
      blocks.push(
        exerciseBlock(
          `block-${blocks.length + 1}`,
          makePrescription({
            exercise: secondaryPress,
            id: `b${blocks.length + 1}-m1`,
            sets: structure.press,
            preferredRole: 'hypertrophy-builder',
            settings: input.settings,
          }),
        ),
      );
    }
    const superset = smartSuperset({
      ranked,
      selected,
      input,
      profile,
      priorities,
      rounds: structure.superset,
      blockNumber: blocks.length + 1,
    });
    if (superset) {
      blocks.push(superset);
    } else if (input.duration === '15' && support) {
      blocks.push(
        exerciseBlock(
          'block-2',
          makePrescription({
            exercise: support,
            id: 'b2-m1',
            sets: 2,
            preferredRole: 'hypertrophy-builder',
            settings: input.settings,
          }),
        ),
      );
    }
    if (structure.core) {
      const core = selectExercise(ranked, selected, (exercise) =>
        ['anti-extension', 'anti-rotation'].includes(exercise.movementPattern),
      );
      if (core) {
        blocks.push(
          exerciseBlock(
            `block-${blocks.length + 1}`,
            makePrescription({
              exercise: core,
              id: `b${blocks.length + 1}-m1`,
              sets: structure.core,
              preferredRole: 'support',
              settings: input.settings,
            }),
          ),
        );
      }
    }
  }

  blocks = applyDropSet(blocks, input);
  blocks = trimToBudget(blocks, targetSeconds);
  const estimate = estimateWorkoutTime(blocks);
  const topPriorities = priorities.slice(0, 4);
  const plannedVolume = calculatePlannedVolume(blocks);
  const techniques = [
    blocks.some((block) => block.kind === 'superset')
      ? 'one safe two-move superset'
      : null,
    blocks.some((block) => block.kind === 'circuit')
      ? 'a low-transition circuit'
      : null,
    blocks.some((block) =>
      (block.kind === 'exercise' ? [block.prescription] : block.moves).some(
        (move) => move.dropSet,
      ),
    )
      ? 'one final safe drop set'
      : null,
  ].filter((value): value is string => Boolean(value));
  const recovering = topPriorities.filter(
    (priority) => priority.recoveryRemaining > 0,
  );
  const compromises: string[] = [];
  if (estimate.totalSeconds < targetSeconds * 0.72) {
    compromises.push(
      'The plan finishes under the ceiling because extra low-value volume was not added.',
    );
  }
  if (input.readiness === 'low') {
    compromises.push(
      'Low readiness keeps all work at a conservative target RIR.',
    );
  }
  const priorityNames = topPriorities.map((priority) =>
    muscleName(priority.muscle),
  );
  const generated: GeneratedWorkout = {
    id: `workout-${input.date.slice(0, 10)}-${input.workoutPosition}-${input.duration}`,
    title:
      profile.primaryGoal === 'General Fitness'
        ? 'Total-body conditioning'
        : `${priorityNames.slice(0, 2).join(' + ')} hybrid`,
    goal: `${profile.primaryGoal} · ${profile.secondaryGoal}`,
    duration: input.duration,
    targetSeconds,
    estimatedSeconds: estimate.totalSeconds,
    estimatedMinutes: Math.ceil(estimate.totalSeconds / 60),
    priorities: topPriorities.map((priority) => priority.muscle),
    prioritySignals: topPriorities.map((priority) => ({
      muscle: priority.muscle,
      weeklyDeficitSets: priority.deficitSets,
      recoveryRemaining: priority.recoveryRemaining,
    })),
    plannedVolume,
    blocks,
    warmupSummary: `${blocks.reduce(
      (total, block) =>
        total +
        (block.kind === 'exercise' ? [block.prescription] : block.moves).reduce(
          (sum, move) => sum + move.warmupSets.length,
          0,
        ),
      0,
    )} non-working ramp set${blocks[0] && (blocks[0].kind !== 'exercise' || blocks[0].prescription.warmupSets.length !== 1) ? 's' : ''}; excluded from PRs, progression, and weekly working volume.`,
    explanation: `${priorityNames.slice(0, 3).join(', ')} carry the largest remaining weekly-volume need. ${
      recovering.length > 0
        ? `${recovering.map((item) => muscleName(item.muscle)).join(' and ')} were down-ranked for recent exposure.`
        : 'No priority muscle is inside a material recovery window.'
    } The plan preserves a progression anchor, adds targeted hypertrophy work${
      techniques.length > 0 ? `, and uses ${techniques.join(' plus ')}` : ''
    } within the selected time ceiling.`,
    confidence: blocks.length >= 2 ? 'high' : 'medium',
    compromises,
    metadata: {
      engineVersion: 1,
      generatedLocally: true,
      deterministicKey: [
        input.date.slice(0, 10),
        input.workoutPosition,
        input.duration,
        input.location.locationId,
        profile.updatedAt,
      ].join(':'),
      usesWeeklyVolume: true,
      usesRecentExposure: true,
      recalibrationEligible: true,
    },
  };
  return generatedWorkoutSchema.parse(generated);
}

export function generationInputFromBundle(
  bundle: AppBundle,
  duration: WorkoutDuration,
  overrides: Partial<
    Pick<
      WorkoutGenerationInput,
      | 'date'
      | 'workoutPosition'
      | 'currentWeeklyVolume'
      | 'recentExposure'
      | 'previousExerciseIds'
      | 'readiness'
      | 'painFlags'
    >
  > = {},
): WorkoutGenerationInput {
  if (!bundle.profile) throw new Error('A local profile is required.');
  return {
    profile: bundle.profile,
    settings: bundle.settings,
    location: resolveTrainingLocation(bundle),
    duration,
    date: overrides.date ?? new Date().toISOString(),
    workoutPosition: overrides.workoutPosition ?? 1,
    currentWeeklyVolume: overrides.currentWeeklyVolume ?? {},
    recentExposure: overrides.recentExposure ?? [],
    previousExerciseIds: overrides.previousExerciseIds ?? [],
    readiness: overrides.readiness ?? 'ready',
    painFlags: overrides.painFlags ?? [],
  };
}

export function generateWorkoutFromBundle(
  bundle: AppBundle,
  duration: WorkoutDuration,
): GeneratedWorkout {
  return generateWorkout(generationInputFromBundle(bundle, duration));
}
