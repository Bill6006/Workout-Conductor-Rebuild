import type {
  CompletedWork,
  RecalibrationScope,
  RecalibrationTrigger,
} from './schema';

export type RecalibrationTriggerDefinition = {
  label: string;
  defaultScope: RecalibrationScope;
  sessionOnly: boolean;
  evaluationMessages: string[];
};

export const recalibrationTriggerRegistry: Record<
  RecalibrationTrigger,
  RecalibrationTriggerDefinition
> = {
  'duration-change': {
    label: 'Workout length changed',
    defaultScope: 'full',
    sessionOnly: true,
    evaluationMessages: [
      'Protecting your highest-value sets',
      'Checking exercise conflicts',
      'Balancing strength and hypertrophy',
    ],
  },
  'location-change': {
    label: 'Location changed',
    defaultScope: 'full',
    sessionOnly: true,
    evaluationMessages: [
      'Checking the new location',
      'Filtering available equipment',
      'Updating the remaining workout',
    ],
  },
  'equipment-profile-change': {
    label: 'Equipment profile changed',
    defaultScope: 'full',
    sessionOnly: true,
    evaluationMessages: [
      'Checking available equipment',
      'Preserving progression roles',
      'Updating the remaining workout',
    ],
  },
  'equipment-unavailable': {
    label: 'Equipment unavailable',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Removing unavailable equipment',
      'Ranking safe alternatives',
      'Protecting completed work',
    ],
  },
  'equipment-busy': {
    label: 'Equipment busy',
    defaultScope: 'local',
    sessionOnly: true,
    evaluationMessages: [
      'Checking this exercise slot',
      'Ranking available alternatives',
      'Keeping the rest of the workout stable',
    ],
  },
  'exercise-replaced': {
    label: 'Exercise replaced',
    defaultScope: 'local',
    sessionOnly: true,
    evaluationMessages: [
      'Validating the replacement',
      'Transferring compatible targets',
      'Keeping other exercises stable',
    ],
  },
  'exercise-skipped': {
    label: 'Exercise skipped',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Protecting completed work',
      'Rechecking weekly priorities',
      'Updating the remaining workout',
    ],
  },
  'pain-reported': {
    label: 'Pain reported',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Applying movement guardrails',
      'Removing conflicting joint stress',
      'Ranking comfortable alternatives',
    ],
  },
  'discomfort-reported': {
    label: 'Exercise marked uncomfortable',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Applying comfort guardrails',
      'Checking exercise conflicts',
      'Updating future work',
    ],
  },
  'performance-over-target': {
    label: 'Performance exceeded target',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Reviewing completed performance',
      'Protecting logged values',
      'Rebalancing future effort',
    ],
  },
  'performance-under-target': {
    label: 'Performance missed target',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Reviewing completed performance',
      'Protecting logged values',
      'Reducing future fatigue where useful',
    ],
  },
  'target-load-change': {
    label: 'Target load changed',
    defaultScope: 'local',
    sessionOnly: true,
    evaluationMessages: [
      'Protecting completed values',
      'Updating this progression target',
      'Keeping other exercises stable',
    ],
  },
  'supersets-change': {
    label: 'Superset preference changed',
    defaultScope: 'full',
    sessionOnly: true,
    evaluationMessages: [
      'Checking superset conflicts',
      'Re-estimating transitions',
      'Updating workout order',
    ],
  },
  'drop-sets-change': {
    label: 'Drop-set preference changed',
    defaultScope: 'full',
    sessionOnly: true,
    evaluationMessages: [
      'Checking drop-set safety',
      'Protecting later priority work',
      'Re-estimating session time',
    ],
  },
  'circuits-change': {
    label: 'Circuit preference changed',
    defaultScope: 'full',
    sessionOnly: true,
    evaluationMessages: [
      'Checking goal compatibility',
      'Reviewing equipment transitions',
      'Updating workout order',
    ],
  },
  'readiness-change': {
    label: 'Readiness changed',
    defaultScope: 'full',
    sessionOnly: true,
    evaluationMessages: [
      'Reviewing readiness',
      'Protecting progression quality',
      'Updating remaining effort',
    ],
  },
  'available-time-change': {
    label: 'Available time changed',
    defaultScope: 'full',
    sessionOnly: true,
    evaluationMessages: [
      'Checking elapsed time',
      'Protecting locked work',
      'Fitting the remaining session',
    ],
  },
  'resume-after-interruption': {
    label: 'Workout resumed',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Checking the interruption window',
      'Protecting completed logs',
      'Rechecking warm-up needs',
    ],
  },
  'completed-work-change': {
    label: 'Completed work changed',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Reading corrected completed work',
      'Protecting locked records',
      'Updating remaining priorities',
    ],
  },
  'station-unavailable': {
    label: 'Station unavailable',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Removing the unavailable station',
      'Ranking safe alternatives',
      'Updating future exercise order',
    ],
  },
  'finish-early': {
    label: 'Finish time changed',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Protecting completed work',
      'Finding the minimum effective finish',
      'Removing low-priority future work',
    ],
  },
  'intensity-request': {
    label: 'Remaining difficulty changed',
    defaultScope: 'partial',
    sessionOnly: true,
    evaluationMessages: [
      'Reviewing remaining fatigue',
      'Protecting completed work',
      'Updating future effort',
    ],
  },
};

export function recalibrationScopeFor(
  trigger: RecalibrationTrigger,
  completedWork: CompletedWork,
): RecalibrationScope {
  const definition = recalibrationTriggerRegistry[trigger];
  if (definition.defaultScope === 'local') return 'local';
  const hasCompletedWork =
    completedWork.sets.length > 0 ||
    completedWork.completedExerciseIds.length > 0;
  return hasCompletedWork ? 'partial' : definition.defaultScope;
}

export function evaluationMessagesFor(
  trigger: RecalibrationTrigger,
  requestedDuration: string,
) {
  const messages = [
    ...recalibrationTriggerRegistry[trigger].evaluationMessages,
  ];
  if (trigger === 'duration-change') {
    messages.unshift(
      requestedDuration === 'default'
        ? 'Restoring the complete intended session'
        : `Fitting the session to ${requestedDuration} minutes`,
    );
  }
  return messages.slice(0, 4);
}
