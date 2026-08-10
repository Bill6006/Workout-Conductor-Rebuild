import { useMemo, useRef, useState } from 'react';
import { equipmentById } from '../catalog/equipment';
import { exerciseById } from '../catalog/exercises';
import { muscleById } from '../catalog/muscles';
import type { EquipmentId } from '../catalog/schema';
import type { AppBundle } from '../domain/models';
import { Icon } from '../components/Icon';
import {
  generateWorkout,
  generationInputFromBundle,
  workoutDurationOptions,
} from '../engine/workoutGenerator/generateWorkout';
import type {
  WorkoutBlock,
  WorkoutDuration,
} from '../engine/workoutGenerator/schema';
import { recalibrateWorkout } from '../engine/recalibration/recalibrateWorkout';
import {
  emptyCompletedWork,
  type RecalibrationTrigger,
  type SuccessfulRecalibration,
} from '../engine/recalibration/schema';
import {
  evaluationMessagesFor,
  recalibrationTriggerRegistry,
} from '../engine/recalibration/triggerRegistry';
import type { ActiveSession } from '../features/activeWorkout/schema';

type TodayViewProps = {
  bundle: AppBundle;
  activeSession: ActiveSession | null;
  onStartWorkout: (workout: ReturnType<typeof generateWorkout>) => void;
};

type PendingRecalibration = {
  trigger: RecalibrationTrigger;
  label: string;
  messages: string[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function blockDetail(block: WorkoutBlock) {
  if (block.kind === 'exercise') {
    const move = block.prescription;
    return `${move.sets} sets · ${move.repRange.min}–${move.repRange.max} reps · ${move.targetRir} RIR · ${move.restSeconds}s rest`;
  }
  return `${block.rounds} rounds · ${block.moves
    .map((move) => `${move.repRange.min}–${move.repRange.max}`)
    .join(' / ')} reps · ${block.restAfterRoundSeconds}s between rounds`;
}

function blockRole(block: WorkoutBlock) {
  if (block.kind === 'superset') return '2-move superset';
  if (block.kind === 'circuit') return `${block.moves.length}-move circuit`;
  return block.prescription.progressionRole.replaceAll('-', ' ');
}

function blockMoves(block: WorkoutBlock) {
  return block.kind === 'exercise' ? [block.prescription] : block.moves;
}

export function TodayView({
  bundle,
  activeSession,
  onStartWorkout,
}: TodayViewProps) {
  const [duration, setDuration] = useState<WorkoutDuration>('default');
  const [showWorkout, setShowWorkout] = useState(false);
  const [workout, setWorkout] = useState(() =>
    generateWorkout(generationInputFromBundle(bundle, 'default')),
  );
  const [pending, setPending] = useState<PendingRecalibration | null>(null);
  const [lastRecalibration, setLastRecalibration] =
    useState<SuccessfulRecalibration | null>(null);
  const [recalibrationError, setRecalibrationError] = useState<string | null>(
    null,
  );
  const [busyEquipment, setBusyEquipment] = useState<EquipmentId | ''>('');
  const requestSequence = useRef(0);
  const profile = bundle.profile!;
  const location =
    bundle.locations.find((item) => item.isDefault) ?? bundle.locations[0];
  const usedEquipment = useMemo(
    () =>
      Array.from(
        new Set(
          workout.blocks.flatMap((block) =>
            blockMoves(block).flatMap(
              (move) =>
                exerciseById.get(move.exerciseId)?.equipment.required ?? [],
            ),
          ),
        ),
      ).filter(
        (equipment): equipment is EquipmentId => equipment !== 'bodyweight',
      ),
    [workout],
  );
  const changedExerciseIds = useMemo(
    () =>
      new Set(
        lastRecalibration?.summary.changes.flatMap((change) =>
          change.kind === 'added' ||
          change.kind === 'substituted' ||
          change.kind === 'sets'
            ? change.exerciseIds
            : [],
        ) ?? [],
      ),
    [lastRecalibration],
  );
  const dayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  async function runRecalibration(args: {
    trigger: RecalibrationTrigger;
    nextDuration?: WorkoutDuration;
    affectedExerciseId?: string | null;
    busyEquipmentIds?: EquipmentId[];
    reason: string;
  }) {
    const nextDuration = args.nextDuration ?? duration;
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setRecalibrationError(null);
    setPending({
      trigger: args.trigger,
      label: recalibrationTriggerRegistry[args.trigger].label,
      messages: evaluationMessagesFor(args.trigger, nextDuration),
    });

    // Yield one brief visual transition so the blocking calibration state is
    // perceivable without making the local engine artificially slow.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 160));
    if (requestSequence.current !== sequence) return;

    const timestamp = new Date().toISOString();
    const result = recalibrateWorkout({
      requestId: `today-${args.trigger}-${sequence}`,
      trigger: args.trigger,
      currentWorkout: workout,
      generationInput: generationInputFromBundle(bundle, duration),
      completedWork: emptyCompletedWork,
      lockedExerciseIds: [],
      pinnedExerciseIds: [],
      userSelectedExerciseIds: [],
      acceptedAlternativeIds: [],
      currentExerciseId: null,
      affectedExerciseId: args.affectedExerciseId ?? null,
      replacementExerciseId: null,
      requestedDuration: nextDuration,
      elapsedSeconds: 0,
      locationOverride: null,
      unavailableEquipmentIds: [],
      sessionBusyEquipmentIds: args.busyEquipmentIds ?? [],
      settingOverrides: {},
      painFlags: [],
      recoveryOverride: null,
      readinessOverride: null,
      performanceChanges: [],
      intensityRequest: null,
      endByExactTime: false,
      reason: args.reason,
      timestamp,
    });
    if (requestSequence.current !== sequence) return;

    if (result.status === 'success') {
      setWorkout(result.workout);
      setLastRecalibration(result);
    } else {
      setWorkout(result.workout);
      setRecalibrationError(
        `${result.errorMessage} Previous valid workout restored.`,
      );
    }
    setPending(null);
  }

  function cancelRecalibration() {
    requestSequence.current += 1;
    setDuration(workout.duration);
    setPending(null);
  }

  function handleDurationChange(nextDuration: WorkoutDuration) {
    setDuration(nextDuration);
    void runRecalibration({
      trigger: 'duration-change',
      nextDuration,
      reason:
        nextDuration === 'default'
          ? 'The complete default session was requested'
          : `The available workout time changed to ${nextDuration} minutes`,
    });
  }

  function handleEquipmentBusy(nextEquipment: EquipmentId | '') {
    setBusyEquipment(nextEquipment);
    if (!nextEquipment) {
      void runRecalibration({
        trigger: 'equipment-profile-change',
        reason: 'All session equipment became available again',
      });
      return;
    }
    const affected = workout.blocks
      .flatMap(blockMoves)
      .find((move) =>
        exerciseById
          .get(move.exerciseId)
          ?.equipment.required.includes(nextEquipment),
      );
    if (!affected) return;
    void runRecalibration({
      trigger: 'equipment-busy',
      affectedExerciseId: affected.exerciseId,
      busyEquipmentIds: [nextEquipment],
      reason: `${equipmentById.get(nextEquipment)?.name ?? nextEquipment} is busy for this session`,
    });
  }

  return (
    <>
      <header className="page-header page-header--phase-one">
        <div>
          <p className="eyebrow">{dayLabel}</p>
          <h1>Ready, {profile.displayName.split(' ')[0]}.</h1>
        </div>
        <div
          className="avatar"
          aria-label={`${profile.displayName} local profile`}
        >
          {initials(profile.displayName)}
        </div>
      </header>

      <div className="phase-banner">
        <span className="status-pill">
          <span /> Phase 5 live
        </span>
        <span className="build-label">WC-P5-0810</span>
      </div>

      <section className="today-hero" aria-labelledby="today-workout-title">
        <div className="today-hero__glow" />
        <div className="today-hero__topline">
          <span className="synthetic-pill">
            <Icon name="spark" size={14} /> Generated locally
          </span>
          <span className="readiness-pill">
            <span /> Ready
          </span>
        </div>
        <p className="overline">Recommended today</p>
        <h2 id="today-workout-title">{workout.title}</h2>
        <p className="generation-goal">{workout.goal}</p>
        <div className="focus-row" aria-label="Muscle focus">
          {workout.priorities.slice(0, 3).map((muscle) => (
            <span key={muscle}>{muscleById.get(muscle)?.name ?? muscle}</span>
          ))}
        </div>

        <div className="today-controls">
          <label className="duration-control">
            <span>
              <Icon name="clock" size={18} /> Workout length
            </span>
            <select
              aria-describedby="duration-preview-note"
              value={duration}
              disabled={Boolean(pending)}
              onChange={(event) =>
                handleDurationChange(event.target.value as WorkoutDuration)
              }
            >
              {workoutDurationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label(profile.typicalDuration)}
                </option>
              ))}
            </select>
          </label>
          <div className="location-control">
            <span>
              <Icon name="pin" size={18} /> Location
            </span>
            <strong>{location?.name ?? 'Choose in Settings'}</strong>
          </div>
        </div>
        <p
          className="preview-note generation-summary"
          id="duration-preview-note"
          aria-live="polite"
        >
          Generated for{' '}
          {workout.duration === 'default'
            ? 'default time'
            : `${workout.duration} minutes`}{' '}
          · estimated {workout.estimatedMinutes} min · {workout.blocks.length}{' '}
          plan blocks
        </p>

        {lastRecalibration && (
          <div className="recalibration-summary" aria-live="polite">
            <Icon name="check" size={16} />
            <div>
              <strong>{lastRecalibration.summary.compact}</strong>
              <span>
                {lastRecalibration.scope} recalibration ·{' '}
                {lastRecalibration.elapsedMilliseconds.toFixed(1)} ms
                {lastRecalibration.summary.protectedRecords > 0
                  ? ` · ${lastRecalibration.summary.protectedRecords} protected records`
                  : ''}
              </span>
            </div>
          </div>
        )}

        {recalibrationError && (
          <div className="recalibration-error" role="alert">
            <Icon name="shield" size={16} /> {recalibrationError}
          </div>
        )}

        <button
          className="primary-button start-workout-button"
          type="button"
          onClick={() => onStartWorkout(workout)}
        >
          {activeSession && activeSession.status !== 'completed'
            ? 'Resume active workout'
            : 'Start workout'}
          <Icon name="arrow" size={20} />
        </button>

        <button
          className="review-workout-button"
          type="button"
          aria-expanded={showWorkout}
          onClick={() => setShowWorkout(!showWorkout)}
        >
          {showWorkout ? 'Hide generated workout' : 'Review generated workout'}
          <Icon name={showWorkout ? 'check' : 'arrow'} size={20} />
        </button>
      </section>

      {showWorkout && (
        <section
          className="exercise-preview"
          aria-label="Generated workout plan"
        >
          <div className="section-heading section-heading--compact">
            <div>
              <p className="eyebrow">Pre-workout plan</p>
              <h2>Generated session</h2>
            </div>
            <span className="quiet-chip">{workout.blocks.length} rows</span>
          </div>
          <div className="exercise-list">
            {workout.blocks.map((block, index) => (
              <article
                className={`exercise-row${blockMoves(block).some((move) => changedExerciseIds.has(move.exerciseId)) ? ' exercise-row--changed' : ''}`}
                key={block.blockId}
              >
                <span className="exercise-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <strong>{block.canonicalRow}</strong>
                  <p>{blockDetail(block)}</p>
                  <div className="block-flags">
                    {blockMoves(block).some(
                      (move) => move.warmupSets.length > 0,
                    ) && <span>Warm-up planned</span>}
                    {blockMoves(block).some((move) => move.dropSet) && (
                      <span>Final drop set</span>
                    )}
                  </div>
                </div>
                <span>{blockRole(block)}</span>
              </article>
            ))}
          </div>
          <p className="warmup-note">{workout.warmupSummary}</p>

          <section
            className="session-adjustment-card"
            aria-labelledby="session-adjustment-title"
          >
            <div>
              <p className="eyebrow">Session adjustment</p>
              <h3 id="session-adjustment-title">Equipment availability</h3>
              <p>
                Busy equipment changes one safe slot and is never saved to your
                location profile.
              </p>
            </div>
            <label>
              <span>Equipment status</span>
              <select
                value={busyEquipment}
                disabled={Boolean(pending)}
                onChange={(event) =>
                  handleEquipmentBusy(event.target.value as EquipmentId | '')
                }
              >
                <option value="">All available</option>
                {Array.from(
                  new Set([
                    ...usedEquipment,
                    ...(busyEquipment ? [busyEquipment] : []),
                  ]),
                ).map((equipment) => (
                  <option key={equipment} value={equipment}>
                    {equipmentById.get(equipment)?.name ?? equipment} busy
                  </option>
                ))}
              </select>
            </label>
            <span className="session-only-chip">Session only</span>
          </section>
        </section>
      )}

      <section className="why-card">
        <div className="why-card__icon">
          <Icon name="spark" size={20} />
        </div>
        <div>
          <p className="overline">Why this workout</p>
          <h3>Progression first. Volume where it is needed.</h3>
          <p>{workout.explanation}</p>
          <div className="confidence-row">
            <span>{workout.confidence} confidence</span>
            <span>Deterministic engine v{workout.metadata.engineVersion}</span>
            {profile.isDemo && <span>Synthetic profile</span>}
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="mini-stat-card">
          <span>
            <Icon name="signal" size={19} />
          </span>
          <p className="eyebrow">Primary goal</p>
          <strong>{profile.primaryGoal}</strong>
          <small>{profile.secondaryGoal}</small>
        </section>
        <section className="mini-stat-card">
          <span>
            <Icon name="plan" size={19} />
          </span>
          <p className="eyebrow">Weekly rhythm</p>
          <strong>{profile.weeklyFrequency} sessions</strong>
          <small>{profile.typicalDuration} min default</small>
        </section>
      </div>

      <section className="local-data-card">
        <Icon name="shield" size={21} />
        <div>
          <strong>Saved and verified locally</strong>
          <p>
            Your profile and locations use durable browser storage. No account
            or cloud history.
          </p>
        </div>
      </section>

      <p className="phase-boundary-note">
        Active logging, editing, rest, alternatives, combined supersets, notes,
        Plate Math, demonstrations, and resume are live. Adaptive coaching
        remains gated to Phase 6.
      </p>

      {pending && (
        <div
          className="calibration-overlay"
          role="status"
          aria-live="assertive"
          aria-label="Recalibrating workout"
        >
          <section className="calibration-card">
            <div className="calibration-spinner" aria-hidden="true" />
            <p className="overline">{pending.label}</p>
            <h2>Rebuilding your workout</h2>
            <ul>
              {pending.messages.map((message) => (
                <li key={message}>
                  <span /> {message}
                </li>
              ))}
            </ul>
            <button type="button" onClick={cancelRecalibration}>
              Keep current workout
            </button>
          </section>
        </div>
      )}
    </>
  );
}
