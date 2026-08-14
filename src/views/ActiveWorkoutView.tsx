import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { equipmentById } from '../catalog/equipment';
import { exerciseById } from '../catalog/exercises';
import type { Exercise } from '../catalog/schema';
import { ExerciseGuide } from '../components/ExerciseGuide';
import { CustomExerciseGuide } from '../components/CustomExerciseGuide';
import { Icon } from '../components/Icon';
import { RestTimer } from '../components/RestTimer';
import { SetLogger } from '../components/SetLogger';
import type { AppBundle } from '../domain/models';
import { rankAlternatives } from '../engine/alternatives/rankAlternatives';
import { recalibrateWorkout } from '../engine/recalibration/recalibrateWorkout';
import { emptyCompletedWork } from '../engine/recalibration/schema';
import { generationInputFromBundle } from '../engine/workoutGenerator/generateWorkout';
import { coachRecommendation } from '../engine/coach/progression';
import { applyConfirmedCoachAction } from '../engine/coach/applyCoachAction';
import type { CoachAction } from '../engine/coach/schema';
import {
  buildSessionSummary,
  detectSessionPersonalRecords,
} from '../engine/analytics/analyzeProgress';
import type {
  ExercisePrescription,
  GeneratedWorkout,
  WorkoutBlock,
} from '../engine/workoutGenerator/schema';
import { calculatePlateMath } from '../features/activeWorkout/plateMath';
import {
  ActiveSessionSchema,
  type ActiveSession,
} from '../features/activeWorkout/schema';
import {
  blockMoves,
  deferCurrentExercise,
  editSet,
  elapsedSessionSeconds,
  finishSession,
  initialSetValues,
  logSet,
  nextSetSlot,
  pauseSession,
  returnToExercise,
  resumeSession,
  setWarmupChoice,
  undoLastSet,
  unfinishedExercises,
  workoutExerciseQueue,
  workoutCompletion,
  type WorkoutExerciseQueueItem,
} from '../features/activeWorkout/session';
import {
  loadExerciseNotes,
  saveExerciseNoteVerified,
} from '../storage/database';

type ActiveWorkoutViewProps = {
  session: ActiveSession;
  bundle: AppBundle;
  sessionHistory: ActiveSession[];
  onSessionChange: (
    session: ActiveSession,
    message?: string,
  ) => Promise<boolean>;
  onSaveWorkout: (
    workout: GeneratedWorkout,
    sessionId: string,
  ) => Promise<void>;
};

function WorkoutNavigator({
  canAct,
  busy,
  onCurrent,
  onQueue,
  onNote,
  onPlateMath,
  onSkip,
}: {
  canAct: boolean;
  busy: boolean;
  onCurrent: () => void;
  onQueue: () => void;
  onNote: () => void;
  onPlateMath: () => void;
  onSkip: () => void;
}) {
  const actions = [
    {
      label: 'Current',
      icon: 'target' as const,
      action: onCurrent,
      disabled: !canAct || busy,
    },
    { label: 'Queue', icon: 'list' as const, action: onQueue, disabled: busy },
    {
      label: 'Note',
      icon: 'note' as const,
      action: onNote,
      disabled: !canAct || busy,
    },
    {
      label: 'Plates',
      icon: 'calculator' as const,
      action: onPlateMath,
      disabled: !canAct || busy,
    },
    {
      label: 'Skip for now',
      icon: 'skip' as const,
      action: onSkip,
      disabled: !canAct || busy,
    },
  ];
  return (
    <nav className="workout-navigator" aria-label="Workout shortcuts">
      {actions.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={item.disabled}
          onClick={item.action}
          aria-label={item.label}
        >
          <Icon name={item.icon} size={18} />
          <span>{item.label === 'Skip for now' ? 'Skip' : item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function ExerciseQueueSheet({
  items,
  onReturn,
  onClose,
}: {
  items: WorkoutExerciseQueueItem[];
  onReturn: (prescriptionId: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  return (
    <div className="sheet-backdrop">
      <section
        className="native-sheet workout-queue-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-queue-title"
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">Workout navigator</p>
            <h2 id="workout-queue-title">Exercise queue</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="queue-help">
          Skipped exercises stay saved here until you return or finish without
          them.
        </p>
        <div className="workout-queue-list">
          {items.map((item, index) => (
            <article key={item.prescriptionId} data-status={item.status}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{item.exerciseName}</strong>
                <small>{item.status}</small>
              </div>
              {item.status === 'skipped' && (
                <button
                  type="button"
                  onClick={() => onReturn(item.prescriptionId)}
                >
                  Return
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CompletionCelebration() {
  return (
    <div className="completion-celebration" role="status" aria-live="polite">
      <div className="completion-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} style={{ '--piece': index } as CSSProperties} />
        ))}
      </div>
      <span>
        <Icon name="spark" size={18} /> Workout complete!
      </span>
    </div>
  );
}

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function prescriptionForSlot(
  block: WorkoutBlock | undefined,
  prescriptionId: string | undefined,
) {
  if (!block || !prescriptionId) return null;
  return (
    blockMoves(block).find((move) => move.prescriptionId === prescriptionId) ??
    null
  );
}

function currentRoundLabel(block: WorkoutBlock, setIndex: number) {
  if (block.kind === 'exercise') return `Set ${setIndex + 1}`;
  return `Round ${setIndex + 1}`;
}

function activeEquipment(bundle: AppBundle) {
  const location =
    bundle.locations.find((item) => item.isDefault) ?? bundle.locations[0];
  const profile = bundle.equipmentProfiles.find(
    (item) => item.id === location?.equipmentProfileId,
  );
  const mapping = new Map([
    ['Adjustable dumbbells', 'dumbbells'],
    ['Barbell and plates', 'barbell'],
    ['Adjustable bench', 'adjustable-bench'],
    ['Pull-up bar', 'pull-up-bar'],
    ['Resistance bands', 'resistance-band'],
    ['Cable station', 'cable-station'],
    ['Machines', 'chest-press-machine'],
    ['Squat rack', 'squat-rack'],
  ]);
  return Array.from(
    new Set([
      'bodyweight',
      ...(profile?.items.map((item) => mapping.get(item)).filter(Boolean) ??
        []),
    ]),
  ) as Array<
    | 'bodyweight'
    | 'dumbbells'
    | 'barbell'
    | 'adjustable-bench'
    | 'pull-up-bar'
    | 'resistance-band'
    | 'cable-station'
    | 'chest-press-machine'
    | 'squat-rack'
  >;
}

export function ActiveWorkoutView({
  session,
  bundle,
  sessionHistory,
  onSessionChange,
  onSaveWorkout,
}: ActiveWorkoutViewProps) {
  const [now, setNow] = useState(() => new Date(session.updatedAt).getTime());
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showFinishWarning, setShowFinishWarning] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [plateWeight, setPlateWeight] = useState(40);
  const [interactionMessage, setInteractionMessage] = useState('');
  const [setSubmissionPending, setSetSubmissionPending] = useState(false);
  const [workoutSavePending, setWorkoutSavePending] = useState(false);
  const [navigationPending, setNavigationPending] = useState(false);
  const setSubmissionLock = useRef(false);
  const navigationLock = useRef(false);
  const finishLock = useRef(false);
  const currentExerciseRef = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLDetailsElement>(null);
  const plateMathRef = useRef<HTMLDetailsElement>(null);
  const finishWarningPrimaryRef = useRef<HTMLButtonElement>(null);
  const [pendingCoachAction, setPendingCoachAction] =
    useState<CoachAction | null>(null);
  const [feedbackDifficulty, setFeedbackDifficulty] = useState<
    'too-easy' | 'right' | 'too-hard' | 'pain'
  >(session.sessionFeedback?.difficulty ?? 'right');
  const [energyAfter, setEnergyAfter] = useState(
    session.sessionFeedback?.energyAfter ?? 3,
  );
  const [feedbackNote, setFeedbackNote] = useState(
    session.sessionFeedback?.note ?? '',
  );

  const slot = nextSetSlot(session);
  const block = slot
    ? session.workout.blocks[slot.blockIndex]
    : session.workout.blocks[session.currentBlockIndex];
  const move = prescriptionForSlot(block, slot?.prescriptionId);
  const exercise = move ? exerciseById.get(move.exerciseId) : undefined;
  const customExercise = move
    ? session.customExerciseSnapshots[move.exerciseId]
    : undefined;
  const completed = workoutCompletion(session);
  const queue = workoutExerciseQueue(session);
  const unfinished = unfinishedExercises(session);
  const livePrs = detectSessionPersonalRecords(
    session,
    sessionHistory,
    bundle.settings.units,
  );
  const elapsed = elapsedSessionSeconds(session, new Date(now));
  const remainingSeconds = Math.max(
    0,
    session.workout.estimatedSeconds - elapsed,
  );
  const blockRecords = block
    ? session.records.filter((record) => record.blockId === block.blockId)
    : session.records;
  const hasWorkingRecordForMove = session.records.some(
    (record) =>
      record.exerciseId === move?.exerciseId && record.kind !== 'warmup',
  );
  const painSignalForMove = session.records.some(
    (record) => record.exerciseId === move?.exerciseId && record.painReported,
  );
  const coach = coachRecommendation({
    session,
    history: sessionHistory.filter((item) => item.id !== session.id),
    bundle,
    currentExerciseId: move?.exerciseId ?? null,
  });

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showFinishWarning) return;
    finishWarningPrimaryRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowFinishWarning(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showFinishWarning]);

  const currentExerciseId = move?.exerciseId;
  const currentSessionNote = currentExerciseId
    ? session.notesByExerciseId[currentExerciseId]
    : undefined;
  useEffect(() => {
    if (!currentExerciseId) return;
    let active = true;
    void loadExerciseNotes().then((notes) => {
      const remembered = notes.find((note) => note.id === currentExerciseId);
      if (active) {
        setNoteDraft(currentSessionNote ?? remembered?.note ?? '');
      }
    });
    return () => {
      active = false;
    };
  }, [currentExerciseId, currentSessionNote]);

  const alternatives = (() => {
    if (!move || !block || !bundle.profile) return [];
    const partner =
      block.kind === 'superset'
        ? (block.moves.find(
            (candidate) => candidate.exerciseId !== move.exerciseId,
          )?.exerciseId ?? null)
        : null;
    return rankAlternatives({
      currentExerciseId: move.exerciseId,
      selectedExerciseIds: session.workout.blocks.flatMap((item) =>
        blockMoves(item).map((candidate) => candidate.exerciseId),
      ),
      dislikedExerciseIds: bundle.profile.dislikedExercises,
      supersetPartnerId: partner,
      context: {
        availableEquipment: activeEquipment(bundle),
        location:
          bundle.locations.find((item) => item.isDefault)?.kind ?? 'home',
        blockedJointStress: [],
        fatiguedMuscles: [],
        shoulderSensitive: bundle.profile.shoulderLimitations,
        avoidBarbellSquat: bundle.profile.avoidBarbellSquats,
        timeBudgetSeconds: Math.max(60, remainingSeconds),
        supersetPairs: [],
      },
    }).ranked.slice(0, 3);
  })();

  const plateResult = exercise
    ? calculatePlateMath(exercise, plateWeight)
    : null;

  function changeSession(next: ActiveSession, message?: string) {
    if (message) setInteractionMessage(message);
    return onSessionChange(next, message);
  }

  function scrollTo(ref: { current: HTMLElement | null }) {
    ref.current?.scrollIntoView?.({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  }

  function openUtility(ref: { current: HTMLDetailsElement | null }) {
    if (!ref.current) return;
    ref.current.open = true;
    scrollTo(ref);
    window.setTimeout(
      () => ref.current?.querySelector<HTMLElement>('textarea, input')?.focus(),
      250,
    );
  }

  async function handleSkipForNow() {
    if (!slot || navigationLock.current || session.status !== 'active') return;
    navigationLock.current = true;
    setNavigationPending(true);
    try {
      const saved = await changeSession(
        deferCurrentExercise(session),
        `${slot.exerciseName} skipped for now. Return from the exercise queue anytime before finishing.`,
      );
      if (saved) setShowOptions(false);
    } finally {
      // Hold the navigation boundary through the browser's complete
      // double-click window so the second activation cannot land on the next
      // exercise after a very fast verified write.
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      navigationLock.current = false;
      setNavigationPending(false);
    }
  }

  async function handleReturnToExercise(prescriptionId: string) {
    if (navigationLock.current) return;
    navigationLock.current = true;
    setNavigationPending(true);
    try {
      const item = queue.find(
        (candidate) => candidate.prescriptionId === prescriptionId,
      );
      const saved = await changeSession(
        returnToExercise(session, prescriptionId),
        `${item?.exerciseName ?? 'Skipped exercise'} returned to the current position. Completed records were preserved.`,
      );
      if (saved) {
        setShowQueue(false);
        window.setTimeout(() => scrollTo(currentExerciseRef), 50);
      }
    } finally {
      navigationLock.current = false;
      setNavigationPending(false);
    }
  }

  async function handleFinish(omitUnfinished: boolean) {
    if (finishLock.current) return;
    finishLock.current = true;
    try {
      const finished = finishSession(session, omitUnfinished);
      const saved = await changeSession(
        finished,
        omitUnfinished
          ? 'Workout finished and verified. Missed exercises were recorded as intentionally omitted.'
          : 'Workout finished and verified locally.',
      );
      if (!saved) return;
      setShowFinishWarning(false);
      setShowCelebration(true);
      window.setTimeout(() => setShowCelebration(false), 2200);
    } finally {
      finishLock.current = false;
    }
  }

  function startRest(next: ActiveSession, restSeconds: number) {
    if (next.status !== 'active' || restSeconds <= 0) return next;
    const timestamp = new Date().toISOString();
    return ActiveSessionSchema.parse({
      ...next,
      restTimer: {
        startedAt: timestamp,
        durationSeconds: restSeconds,
        targetSeconds: restSeconds,
        status: 'running',
      },
      lastRestStartedAt: timestamp,
      lastRestTargetSeconds: restSeconds,
      updatedAt: timestamp,
    });
  }

  async function handleLog(
    values: { weight: number; reps: number; rir: number },
    responseMilliseconds: number,
  ) {
    if (!slot || !block || setSubmissionLock.current) return;
    setSubmissionLock.current = true;
    setSetSubmissionPending(true);
    try {
      const logged = logSet(session, slot, values);
      const isRoundEnd =
        block.kind === 'exercise' ||
        slot.moveIndex === blockMoves(block).length - 1;
      const next = isRoundEnd ? startRest(logged, slot.restSeconds) : logged;
      await changeSession(
        next,
        next.status === 'completed'
          ? 'Workout complete. Final block closed without an extra set or timer.'
          : `${slot.kind === 'warmup' ? 'Warm-up' : 'Set'} saved and verified locally in ${responseMilliseconds.toFixed(1)} ms.`,
      );
    } finally {
      // Keep the shared action boundary latched across the browser's complete
      // double-click window. The next slot can render immediately after the
      // verified write, so releasing here synchronously would let the second
      // click land on a brand-new enabled form.
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      setSubmissionLock.current = false;
      setSetSubmissionPending(false);
    }
  }

  function handleTimerAdjust(delta: number) {
    if (!session.restTimer) return;
    changeSession(
      ActiveSessionSchema.parse({
        ...session,
        restTimer: {
          ...session.restTimer,
          durationSeconds: Math.max(
            5,
            Math.min(900, session.restTimer.durationSeconds + delta),
          ),
        },
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function clearTimer() {
    if (!session.restTimer) return;
    changeSession(
      ActiveSessionSchema.parse({
        ...session,
        restTimer: null,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  async function saveNote() {
    if (!move) return;
    const timestamp = new Date().toISOString();
    const verified = await saveExerciseNoteVerified({
      id: move.exerciseId,
      note: noteDraft.trim(),
      updatedAt: timestamp,
    });
    changeSession(
      ActiveSessionSchema.parse({
        ...session,
        notesByExerciseId: {
          ...session.notesByExerciseId,
          [move.exerciseId]: verified.note,
        },
        updatedAt: timestamp,
      }),
      'Exercise note saved and remembered for the next session.',
    );
  }

  function replaceCurrentExercise(replacementId: string) {
    if (!move) return;
    const timestamp = new Date().toISOString();
    const replacement = exerciseById.get(replacementId);
    if (hasWorkingRecordForMove && painSignalForMove && replacement) {
      const update = (candidate: ExercisePrescription) =>
        candidate.prescriptionId === move.prescriptionId
          ? {
              ...candidate,
              exerciseId: replacement.id,
              exerciseName: replacement.name,
              catalogRole: replacement.trainingRole,
              progressionFamily: replacement.progressionFamily,
              repRange: replacement.typicalRepRange,
              warmupSets: [],
              dropSet:
                replacement.dropSet.support === 'safe'
                  ? candidate.dropSet
                  : null,
              rationale:
                'Pain-free alternative confirmed for unfinished sets; completed records remain attached to the original exercise.',
            }
          : candidate;
      const blocks = session.workout.blocks.map((candidate) => {
        if (candidate.kind === 'exercise') {
          const prescription = update(candidate.prescription);
          return {
            ...candidate,
            prescription,
            canonicalRow: prescription.exerciseName,
          };
        }
        const moves = candidate.moves.map(update);
        return candidate.kind === 'superset'
          ? {
              ...candidate,
              moves: [moves[0], moves[1]] as [
                ExercisePrescription,
                ExercisePrescription,
              ],
              canonicalRow: moves.map((item) => item.exerciseName).join(' + '),
            }
          : {
              ...candidate,
              moves,
              canonicalRow: moves.map((item) => item.exerciseName).join(' + '),
            };
      });
      changeSession(
        ActiveSessionSchema.parse({
          ...session,
          workout: { ...session.workout, blocks },
          acceptedAlternativeIds: Array.from(
            new Set([...session.acceptedAlternativeIds, replacementId]),
          ),
          updatedAt: timestamp,
        }),
        `${move.exerciseName} replaced for unfinished sets. Its completed records remain unchanged.`,
      );
      setShowAlternatives(false);
      return;
    }
    if (hasWorkingRecordForMove) return;
    const result = recalibrateWorkout({
      requestId: `active-replacement-${timestamp}`,
      trigger: 'exercise-replaced',
      currentWorkout: session.workout,
      generationInput: generationInputFromBundle(
        bundle,
        session.workout.duration,
      ),
      completedWork: {
        ...emptyCompletedWork,
        sets: session.records
          .filter((record) => record.kind !== 'warmup')
          .map((record) => ({
            recordId: record.id,
            blockId: record.blockId,
            prescriptionId: record.prescriptionId,
            exerciseId: record.exerciseId,
            setIndex: record.setIndex,
            load: record.weight,
            reps: record.reps,
            rir: record.rir,
            completedAt: record.completedAt,
            locked: true,
          })),
        notesByExerciseId: session.notesByExerciseId,
      },
      lockedExerciseIds: [],
      pinnedExerciseIds: session.pinnedExerciseIds,
      userSelectedExerciseIds: [],
      acceptedAlternativeIds: session.acceptedAlternativeIds,
      currentExerciseId: move.exerciseId,
      affectedExerciseId: move.exerciseId,
      replacementExerciseId: replacementId,
      requestedDuration: session.workout.duration,
      elapsedSeconds: elapsed,
      locationOverride: null,
      unavailableEquipmentIds: [],
      sessionBusyEquipmentIds: [],
      settingOverrides: {},
      painFlags: [],
      recoveryOverride: null,
      readinessOverride: null,
      performanceChanges: [],
      intensityRequest: null,
      endByExactTime: false,
      reason: 'The athlete selected one ranked alternative during the workout',
      timestamp,
    });
    if (result.status !== 'success') {
      setInteractionMessage(result.errorMessage);
      return;
    }
    const replacementName = exerciseById.get(replacementId);
    const replacementMove = result.workout.blocks
      .flatMap(blockMoves)
      .find((candidate) => candidate.exerciseId === replacementId);
    changeSession(
      ActiveSessionSchema.parse({
        ...session,
        workout: result.workout,
        acceptedAlternativeIds: Array.from(
          new Set([...session.acceptedAlternativeIds, replacementId]),
        ),
        warmupSelections: replacementMove
          ? {
              ...session.warmupSelections,
              [replacementMove.prescriptionId]: 'pending',
            }
          : session.warmupSelections,
        updatedAt: timestamp,
      }),
      `${move.exerciseName} replaced with ${replacementName?.name ?? replacementId}. Only this exercise changed.`,
    );
    setShowAlternatives(false);
  }

  function requestCoachAction(action: CoachAction) {
    if (action.kind === 'open-alternatives') {
      setShowAlternatives(true);
      return;
    }
    setPendingCoachAction(action);
  }

  function confirmCoachAction() {
    if (!pendingCoachAction) return;
    const next = applyConfirmedCoachAction(session, pendingCoachAction);
    changeSession(
      next,
      `${pendingCoachAction.label} confirmed. Completed records were not changed.`,
    );
    setPendingCoachAction(null);
  }

  function reportPain() {
    const timestamp = new Date().toISOString();
    const latestForExercise = [...session.records]
      .reverse()
      .find((record) => record.exerciseId === move?.exerciseId);
    changeSession(
      ActiveSessionSchema.parse({
        ...session,
        records: session.records.map((record) =>
          record.id === latestForExercise?.id
            ? { ...record, painReported: true, editedAt: timestamp }
            : record,
        ),
        readiness: {
          ...session.readiness,
          jointDiscomfort: 'moderate',
          checkedAt: timestamp,
        },
        updatedAt: timestamp,
      }),
      'Pain signal saved. The coach will prioritize a pain-free alternative.',
    );
    setShowOptions(false);
  }

  function saveSessionFeedback() {
    const timestamp = new Date().toISOString();
    changeSession(
      ActiveSessionSchema.parse({
        ...session,
        sessionFeedback: {
          difficulty: feedbackDifficulty,
          energyAfter,
          note: feedbackNote.trim(),
          submittedAt: timestamp,
        },
        updatedAt: timestamp,
      }),
      'Session feedback saved locally for the next recommendation.',
    );
  }

  if (session.status === 'completed') {
    const summary = buildSessionSummary(
      session,
      sessionHistory,
      bundle.profile!,
      bundle.settings.units,
    );
    return (
      <section
        className="completion-surface"
        aria-labelledby="completion-title"
      >
        {showCelebration && <CompletionCelebration />}
        <div className="completion-check">
          <Icon name="check" size={34} />
        </div>
        <p className="eyebrow">Session complete</p>
        <h1 id="completion-title">Strong work. Logged locally.</h1>
        <p>
          Your completed records now inform the next progression target and
          remain private in verified local storage.
        </p>
        <div className="completion-grid">
          <div>
            <strong>{formatClock(elapsed)}</strong>
            <span>elapsed</span>
          </div>
          <div>
            <strong>{completed.completedSets}</strong>
            <span>working sets</span>
          </div>
          <div>
            <strong>{completed.exercises}</strong>
            <span>exercises</span>
          </div>
          <div>
            <strong>{Math.round(completed.volume).toLocaleString()}</strong>
            <span>volume ({session.weightUnit})</span>
          </div>
        </div>
        <div className="completion-flags">
          <span>{completed.warmupSets} warm-ups excluded</span>
          <span>{completed.omittedExercises} intentionally omitted</span>
          <span>Verified local save</span>
        </div>
        {summary.personalRecords.length > 0 && (
          <section
            className="completion-prs"
            aria-labelledby="completion-pr-title"
          >
            <p className="overline">Personal records</p>
            <h2 id="completion-pr-title">
              {summary.personalRecords.length} milestone
              {summary.personalRecords.length === 1 ? '' : 's'} today
            </h2>
            <div className="pr-grid">
              {summary.personalRecords.map((record) => (
                <article className="pr-card" key={record.id}>
                  <span className="pr-badge">PR</span>
                  <div>
                    <strong>{record.exerciseName}</strong>
                    <p>
                      {record.label} · {record.detail}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <section
          className="session-summary"
          aria-labelledby="session-summary-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Evidence-led recap</p>
              <h2 id="session-summary-title">Session Summary</h2>
            </div>
            <span
              className={`confidence-chip confidence-chip--${summary.confidence}`}
            >
              {summary.confidence}
            </span>
          </div>
          <div className="summary-muscles">
            {summary.musclesTrained.slice(0, 8).map((row) => (
              <span key={row.muscle}>
                {row.name} · {row.effectiveSets}
              </span>
            ))}
          </div>
          <div className="summary-detail-grid">
            <article>
              <strong>Recovery note</strong>
              <p>{summary.recoveryNote}</p>
            </article>
            <article>
              <strong>Substitutions</strong>
              <p>
                {summary.substitutions
                  ? `${summary.substitutions} accepted; original completed records preserved.`
                  : 'No substitutions accepted.'}
              </p>
            </article>
            <article>
              <strong>Intentionally omitted</strong>
              {summary.omittedExercises.length > 0 ? (
                <ul>
                  {summary.omittedExercises.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p>None. Every planned exercise was completed.</p>
              )}
            </article>
            <article>
              <strong>Next targets</strong>
              <ul>
                {summary.nextTargets.map((target) => (
                  <li key={target}>{target}</li>
                ))}
              </ul>
            </article>
            <article>
              <strong>Next focus</strong>
              <p>{summary.nextFocus}</p>
            </article>
          </div>
          <small className="summary-sample">
            {summary.sampleLabel} · warm-ups excluded from records and working
            totals
          </small>
          {Object.keys(session.notesByExerciseId).length > 0 && (
            <details className="summary-notes">
              <summary>Exercise notes</summary>
              {Object.entries(session.notesByExerciseId).map(([id, note]) => (
                <p key={id}>
                  <strong>{exerciseById.get(id)?.name ?? id}:</strong> {note}
                </p>
              ))}
            </details>
          )}
          <button
            className="review-workout-button"
            type="button"
            disabled={workoutSavePending}
            onClick={() => {
              if (workoutSavePending) return;
              setWorkoutSavePending(true);
              void onSaveWorkout(session.workout, session.id).finally(() =>
                setWorkoutSavePending(false),
              );
            }}
          >
            <Icon name="check" size={17} />{' '}
            {workoutSavePending ? 'Saving workout…' : 'Save this workout'}
          </button>
        </section>
        <section
          className="session-feedback"
          aria-labelledby="session-feedback-title"
        >
          <p className="overline">Session feedback</p>
          <h2 id="session-feedback-title">How did the whole workout land?</h2>
          <div className="feedback-options">
            {(['too-easy', 'right', 'too-hard', 'pain'] as const).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  className={feedbackDifficulty === value ? 'is-selected' : ''}
                  onClick={() => setFeedbackDifficulty(value)}
                >
                  {value === 'right' ? 'About right' : value.replace('-', ' ')}
                </button>
              ),
            )}
          </div>
          <label>
            <span>Energy after · {energyAfter}/5</span>
            <input
              type="range"
              min="1"
              max="5"
              value={energyAfter}
              onChange={(event) => setEnergyAfter(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Optional note</span>
            <textarea
              maxLength={500}
              value={feedbackNote}
              onChange={(event) => setFeedbackNote(event.target.value)}
              placeholder="Recovery, discomfort, or what felt unusually strong"
            />
          </label>
          <button
            className="primary-button"
            type="button"
            onClick={saveSessionFeedback}
          >
            {session.sessionFeedback ? 'Update feedback' : 'Save feedback'}
          </button>
        </section>
      </section>
    );
  }

  if (!slot || !block || !move) {
    const firstDeferred = queue.find((item) => item.status === 'skipped');
    return (
      <>
        <header className="active-workout-header">
          <div>
            <p className="eyebrow">Active workout</p>
            <h1>{session.workout.title}</h1>
          </div>
          <button
            type="button"
            className="pause-button"
            onClick={() =>
              changeSession(pauseSession(session), 'Workout paused.')
            }
          >
            Pause
          </button>
        </header>
        <div className="phase-banner">
          <span className="status-pill">
            <span /> Phase 8 UX enhancement
          </span>
          <span className="build-label">WC-P8UX-0814</span>
        </div>
        <WorkoutNavigator
          canAct={false}
          busy={navigationPending}
          onCurrent={() => undefined}
          onQueue={() => setShowQueue(true)}
          onNote={() => undefined}
          onPlateMath={() => undefined}
          onSkip={() => undefined}
        />
        <section
          className="finish-workout-card"
          aria-labelledby="finish-workout-title"
        >
          <div className="completion-check">
            <Icon name="check" size={30} />
          </div>
          <p className="eyebrow">Final check</p>
          <h2 id="finish-workout-title">
            {unfinished.length > 0
              ? `${unfinished.length} skipped ${unfinished.length === 1 ? 'exercise is' : 'exercises are'} still waiting.`
              : 'All planned exercises are complete.'}
          </h2>
          <p>
            {unfinished.length > 0
              ? 'Return to them from the queue, or finish and record them as intentionally omitted.'
              : 'Finish now to verify the completed session and close the workout.'}
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              unfinished.length > 0
                ? setShowFinishWarning(true)
                : void handleFinish(false)
            }
          >
            Finish workout
          </button>
          {unfinished.length > 0 && (
            <button type="button" onClick={() => setShowQueue(true)}>
              Review exercise queue
            </button>
          )}
        </section>
        {showQueue && (
          <ExerciseQueueSheet
            items={queue}
            onReturn={(id) => void handleReturnToExercise(id)}
            onClose={() => setShowQueue(false)}
          />
        )}
        {showFinishWarning && (
          <div className="sheet-backdrop">
            <section
              className="native-sheet finish-warning-sheet"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="finish-warning-title"
            >
              <p className="eyebrow">Missed workout items</p>
              <h2 id="finish-warning-title">Finish without these exercises?</h2>
              <ul>
                {unfinished.map((item) => (
                  <li key={item.prescriptionId}>{item.exerciseName}</li>
                ))}
              </ul>
              <p>
                They will be recorded as intentionally omitted and excluded from
                volume, personal records, and progression.
              </p>
              <div className="finish-warning-actions">
                <button
                  ref={finishWarningPrimaryRef}
                  className="primary-button"
                  type="button"
                  disabled={!firstDeferred}
                  onClick={() =>
                    firstDeferred &&
                    void handleReturnToExercise(firstDeferred.prescriptionId)
                  }
                >
                  Return to missed exercises
                </button>
                <button type="button" onClick={() => void handleFinish(true)}>
                  Finish without them
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinishWarning(false)}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        )}
        {session.status === 'paused' && (
          <div className="sheet-backdrop">
            <section
              className="pause-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pause-workout-title"
            >
              <p className="eyebrow">Workout paused</p>
              <h2 id="pause-workout-title">Your place is saved.</h2>
              <button
                type="button"
                onClick={() =>
                  changeSession(resumeSession(session), 'Workout resumed.')
                }
              >
                Resume workout
              </button>
            </section>
          </div>
        )}
      </>
    );
  }
  const warmupChoice = session.warmupSelections[move.prescriptionId];
  const nextBlock = session.workout.blocks[slot.blockIndex + 1];

  return (
    <>
      <header className="active-workout-header">
        <div>
          <p className="eyebrow">Active workout</p>
          <h1>{session.workout.title}</h1>
        </div>
        <button
          type="button"
          className="pause-button"
          onClick={() =>
            changeSession(pauseSession(session), 'Workout paused.')
          }
        >
          Pause
        </button>
      </header>

      <div className="phase-banner">
        <span className="status-pill">
          <span /> Phase 8 UX enhancement
        </span>
        <span className="build-label">WC-P8UX-0814</span>
      </div>

      <WorkoutNavigator
        canAct={session.status === 'active'}
        busy={navigationPending}
        onCurrent={() => scrollTo(currentExerciseRef)}
        onQueue={() => setShowQueue(true)}
        onNote={() => openUtility(noteRef)}
        onPlateMath={() => openUtility(plateMathRef)}
        onSkip={() => void handleSkipForNow()}
      />

      {livePrs.length > 0 && (
        <div className="live-pr-strip" role="status">
          <span className="pr-badge">PR</span>
          <strong>{livePrs.at(-1)!.exerciseName}</strong>
          <span>
            {livePrs.at(-1)!.label} · {livePrs.at(-1)!.detail}
          </span>
        </div>
      )}

      <section
        className="adaptive-coach adaptive-coach--active"
        aria-labelledby="active-coach-title"
      >
        <div className="adaptive-coach__heading">
          <div className="adaptive-coach__mark">
            <Icon name="spark" size={20} />
          </div>
          <div>
            <p className="overline">Adaptive Coach</p>
            <h2 id="active-coach-title">{coach.title}</h2>
          </div>
          <span>{coach.priority.replaceAll('-', ' ')}</span>
        </div>
        <p>{coach.guidance}</p>
        {coach.nextTarget && (
          <strong className="coach-target">
            Next target · {coach.nextTarget}
          </strong>
        )}
        <details>
          <summary>Why</summary>
          <p>{coach.why}</p>
          {coach.evidence.map((item) => (
            <small key={item}>{item}</small>
          ))}
        </details>
        {coach.action && !pendingCoachAction && (
          <button
            type="button"
            onClick={() => requestCoachAction(coach.action!)}
          >
            {coach.action.label}
          </button>
        )}
        {pendingCoachAction && (
          <div className="coach-confirm" role="alert">
            <span>
              Apply this to unfinished work? Completed and manually corrected
              sets stay untouched.
            </span>
            <button type="button" onClick={confirmCoachAction}>
              Confirm
            </button>
            <button type="button" onClick={() => setPendingCoachAction(null)}>
              Keep plan
            </button>
          </div>
        )}
      </section>

      <section className="workout-clock-strip" aria-label="Workout timing">
        <div>
          <span>Elapsed</span>
          <strong>{formatClock(elapsed)}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>~{formatClock(remainingSeconds)}</strong>
        </div>
        <div>
          <span>Progress</span>
          <strong>
            {slot.blockIndex + 1}/{session.workout.blocks.length}
          </strong>
        </div>
      </section>

      {interactionMessage && (
        <button
          className="active-save-message"
          type="button"
          onClick={() => setInteractionMessage('')}
        >
          <Icon name="check" size={16} /> {interactionMessage}
        </button>
      )}

      <section
        ref={currentExerciseRef}
        className={`active-exercise-card${block.kind === 'superset' ? ' active-exercise-card--superset' : ''}`}
        aria-labelledby="active-exercise-title"
      >
        <div className="active-exercise-card__topline">
          <span>
            {block.kind === 'superset'
              ? `Superset · round ${(slot.roundIndex ?? slot.setIndex) + 1} of ${block.rounds}`
              : `${slot.kind === 'warmup' ? 'Warm-up' : slot.kind === 'drop' ? 'Drop set' : 'Working set'} ${slot.setIndex + 1} of ${move.sets}`}
          </span>
          <span>
            {slot.kind === 'drop'
              ? 'Final intensity set'
              : move.progressionRole.replaceAll('-', ' ')}
          </span>
        </div>

        {block.kind === 'superset' && (
          <div className="superset-moves" aria-label="Superset moves">
            {block.moves.map((candidate, index) => (
              <div
                key={candidate.prescriptionId}
                className={index === slot.moveIndex ? 'is-current' : undefined}
              >
                <span>{index === 0 ? 'A' : 'B'}</span>
                <strong>{candidate.exerciseName}</strong>
                <small>
                  {candidate.repRange.min}–{candidate.repRange.max} reps
                </small>
              </div>
            ))}
          </div>
        )}

        <div className="active-exercise-heading">
          <div>
            <p className="overline">
              {block.kind === 'superset'
                ? `Move ${slot.moveIndex === 0 ? 'A' : 'B'}`
                : 'Current exercise'}
            </p>
            <h2 id="active-exercise-title">{move.exerciseName}</h2>
            <p>
              Previous:{' '}
              {session.records
                .filter((record) => record.exerciseId === move.exerciseId)
                .at(-1)
                ? `${session.records.filter((record) => record.exerciseId === move.exerciseId).at(-1)?.weight} ${session.records.filter((record) => record.exerciseId === move.exerciseId).at(-1)?.weightUnit} × ${session.records.filter((record) => record.exerciseId === move.exerciseId).at(-1)?.reps}`
                : 'No completed set yet'}
            </p>
          </div>
          {exercise ? (
            <ExerciseGuide exercise={exercise} />
          ) : (
            <span className="custom-exercise-chip">Custom exercise</span>
          )}
        </div>

        {customExercise && <CustomExerciseGuide exercise={customExercise} />}

        {warmupChoice === 'pending' && move.warmupSets.length > 0 && (
          <section className="warmup-choice" aria-label="Warm-up choice">
            <div>
              <strong>Calculated ramp available</strong>
              <span>
                {move.warmupSets.length} non-working sets · excluded from PRs
                and volume
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                changeSession(
                  setWarmupChoice(session, move.prescriptionId, 'added'),
                  'Warm-up ramp added.',
                )
              }
            >
              Add ramp
            </button>
            <button
              type="button"
              onClick={() =>
                changeSession(
                  setWarmupChoice(session, move.prescriptionId, 'skipped'),
                  'Warm-up skipped.',
                )
              }
            >
              Skip
            </button>
          </section>
        )}

        <SetLogger
          key={`${slot.prescriptionId}:${move.exerciseId}:${slot.kind}:${slot.setIndex}:${slot.roundIndex}`}
          loggerKey={`${slot.prescriptionId}:${move.exerciseId}:${slot.kind}:${slot.setIndex}:${slot.roundIndex}`}
          exerciseName={move.exerciseName}
          setLabel={
            slot.kind === 'warmup'
              ? `Warm-up ${slot.setIndex + 1}`
              : slot.kind === 'drop'
                ? 'Drop set'
                : currentRoundLabel(block, slot.setIndex)
          }
          targetReps={slot.targetReps}
          targetRir={slot.targetRir}
          units={session.weightUnit}
          initialValues={initialSetValues(session.records, move, slot)}
          disabled={session.status !== 'active' || setSubmissionPending}
          onSubmit={(values, responseMilliseconds) =>
            void handleLog(values, responseMilliseconds)
          }
        />

        <div className="active-exercise-actions">
          <button type="button" onClick={() => setShowOptions(true)}>
            Set options
          </button>
          <button type="button" onClick={() => setShowWhy(!showWhy)}>
            Why
          </button>
          <button
            type="button"
            disabled={hasWorkingRecordForMove && !painSignalForMove}
            onClick={() => setShowAlternatives(true)}
          >
            Alternatives
          </button>
        </div>

        {showWhy && (
          <div className="set-why-panel">
            <strong>{move.rationale}</strong>
            <p>{slot.loadGuidance}</p>
            <span>
              {hasWorkingRecordForMove && !painSignalForMove
                ? 'Current exercise locked after its first working set unless pain is reported.'
                : painSignalForMove
                  ? 'A confirmed pain-free alternative changes unfinished sets only.'
                  : 'This slot can still be replaced without changing neighboring work.'}
            </span>
          </div>
        )}
      </section>

      {session.restTimer && (
        <RestTimer
          timer={session.restTimer}
          nextTarget={`${slot.exerciseName} · ${slot.targetReps} reps`}
          onAdjust={handleTimerAdjust}
          onSkip={clearTimer}
          onComplete={clearTimer}
        />
      )}

      <section
        className="completed-set-panel"
        aria-labelledby="completed-sets-title"
      >
        <div className="section-heading section-heading--compact">
          <div>
            <p className="eyebrow">Completed history</p>
            <h2 id="completed-sets-title">
              {block.kind === 'superset' ? 'Superset rounds' : 'Sets'}
            </h2>
          </div>
          <span className="quiet-chip">Tap Edit to correct</span>
        </div>
        {blockRecords.length === 0 ? (
          <p className="empty-completed-sets">
            No completed sets in this block yet.
          </p>
        ) : (
          <div className="completed-set-list">
            {blockRecords.map((record) => (
              <article key={record.id}>
                <div className="completed-set-row">
                  <span className="completed-indicator">
                    <Icon name="check" size={14} />
                  </span>
                  <div>
                    <strong>
                      {record.kind === 'warmup'
                        ? `Warm-up ${record.setIndex + 1}`
                        : block.kind === 'superset'
                          ? `Round ${(record.roundIndex ?? record.setIndex) + 1}${record.moveIndex === 0 ? 'A' : 'B'}`
                          : `Set ${record.setIndex + 1}`}
                    </strong>
                    <span>{record.exerciseName}</span>
                  </div>
                  <b>
                    {record.legacyInvalidReps
                      ? `Legacy ${record.legacyInvalidReps}-rep entry excluded — edit to restore evidence`
                      : `${record.weight} ${record.weightUnit} × ${record.reps} · ${record.rir} RIR`}
                  </b>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRecordId(
                        editingRecordId === record.id ? null : record.id,
                      )
                    }
                  >
                    {editingRecordId === record.id ? 'Close' : 'Edit'}
                  </button>
                </div>
                {editingRecordId === record.id && (
                  <SetLogger
                    key={`edit:${record.id}`}
                    loggerKey={`edit:${record.id}`}
                    exerciseName={record.exerciseName}
                    setLabel={`Edit ${record.kind} set`}
                    targetReps={String(record.reps)}
                    targetRir={record.rir}
                    units={record.weightUnit}
                    initialValues={record}
                    submitLabel="Save correction"
                    onSubmit={(values) => {
                      changeSession(
                        editSet(session, record.id, values),
                        'Completed set corrected without adding a set or rest timer.',
                      );
                      setEditingRecordId(null);
                    }}
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="workout-utility-grid">
        <details ref={noteRef} className="workout-utility-card">
          <summary>Exercise note</summary>
          <label>
            <span>Grip, seat height, setup, or form cue</span>
            <textarea
              value={noteDraft}
              maxLength={500}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="Example: neutral grip, bench notch 3"
            />
          </label>
          <button type="button" onClick={() => void saveNote()}>
            Save cue memory
          </button>
        </details>

        <details ref={plateMathRef} className="workout-utility-card">
          <summary>Plate Math</summary>
          <label>
            <span>Target weight</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={plateWeight}
              onChange={(event) => setPlateWeight(Number(event.target.value))}
            />
          </label>
          <strong>{plateResult?.label ?? 'Custom loading instructions'}</strong>
          {plateResult && plateResult.remainder > 0 && (
            <span>
              Closest with inventory: {plateResult.remainder} lb per side
              remains.
            </span>
          )}
          {exercise && (
            <small>
              {exercise.plateMath.eachHand
                ? 'Weight is clarified for each hand.'
                : equipmentById.get(exercise.equipment.required[0])?.name}
            </small>
          )}
        </details>
      </section>

      <section
        className="active-workout-list"
        aria-labelledby="active-list-title"
      >
        <div className="section-heading section-heading--compact">
          <div>
            <p className="eyebrow">Workout list</p>
            <h2 id="active-list-title">One row per block</h2>
          </div>
        </div>
        {session.workout.blocks.map((item, index) => (
          <div
            key={item.blockId}
            className={`active-list-row${index === slot.blockIndex ? ' is-current' : ''}${index < slot.blockIndex ? ' is-complete' : ''}`}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item.canonicalRow}</strong>
            <small>
              {index < slot.blockIndex
                ? 'Complete'
                : index === slot.blockIndex
                  ? 'Current'
                  : 'Up next'}
            </small>
          </div>
        ))}
      </section>

      {nextBlock && (
        <section className="next-exercise-card">
          <span>Next</span>
          <strong>{nextBlock.canonicalRow}</strong>
          <small>Swipe-free preview</small>
        </section>
      )}

      {session.status === 'paused' && (
        <div className="sheet-backdrop">
          <section
            className="pause-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-workout-title"
          >
            <p className="eyebrow">Workout paused</p>
            <h2 id="pause-workout-title">Your place is saved.</h2>
            <p>
              Elapsed workout time is frozen. Completed records remain verified
              locally.
            </p>
            <button
              type="button"
              onClick={() =>
                changeSession(resumeSession(session), 'Workout resumed.')
              }
            >
              Resume workout
            </button>
          </section>
        </div>
      )}

      {showOptions && (
        <div className="sheet-backdrop">
          <section
            className="native-sheet set-options-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="set-options-title"
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div>
                <p className="eyebrow">Current block</p>
                <h2 id="set-options-title">Set options</h2>
              </div>
              <button type="button" onClick={() => setShowOptions(false)}>
                Done
              </button>
            </div>
            <button
              type="button"
              disabled={session.records.length === 0}
              onClick={() => {
                changeSession(undoLastSet(session), 'Last set undone.');
                setShowOptions(false);
              }}
            >
              Undo last set
            </button>
            <button
              type="button"
              disabled={navigationPending}
              onClick={() => void handleSkipForNow()}
            >
              Skip exercise for now
            </button>
            <button
              type="button"
              onClick={() => {
                changeSession(pauseSession(session), 'Workout paused.');
                setShowOptions(false);
              }}
            >
              Pause workout
            </button>
            <button type="button" onClick={reportPain}>
              Report pain on current exercise
            </button>
          </section>
        </div>
      )}

      {showQueue && (
        <ExerciseQueueSheet
          items={queue}
          onReturn={(id) => void handleReturnToExercise(id)}
          onClose={() => setShowQueue(false)}
        />
      )}

      {showAlternatives && (
        <div className="sheet-backdrop">
          <section
            className="native-sheet alternatives-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="alternatives-title"
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div>
                <p className="eyebrow">One-slot replacement</p>
                <h2 id="alternatives-title">Alternatives</h2>
              </div>
              <button type="button" onClick={() => setShowAlternatives(false)}>
                Close
              </button>
            </div>
            {alternatives.map((candidate) => {
              const candidateExercise = candidate.exercise as Exercise;
              return (
                <article
                  key={candidateExercise.id}
                  className="active-alternative-card"
                >
                  <div>
                    <span>{candidate.score}% match</span>
                    <strong>{candidateExercise.name}</strong>
                    <small>{candidate.primaryReason}</small>
                    <small>{candidate.keyDifference}</small>
                  </div>
                  <ExerciseGuide exercise={candidateExercise} />
                  <button
                    type="button"
                    className="replacement-button"
                    onClick={() => replaceCurrentExercise(candidateExercise.id)}
                  >
                    Use this exercise
                  </button>
                </article>
              );
            })}
          </section>
        </div>
      )}
    </>
  );
}
