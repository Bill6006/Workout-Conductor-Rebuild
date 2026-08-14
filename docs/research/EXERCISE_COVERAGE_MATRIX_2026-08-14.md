# Exercise catalog coverage matrix

Release target: Phase 8 R5 YELLOW. Catalog size: 50 conventional movements.

The executable registry and `catalog.test.ts` are the source of truth. Tests require every registered muscle, movement pattern, equipment family, progression family, substitution reference, and media reference to be covered.

| Coverage area             | Added or reinforced standard options                                                 | Why it closes a real recommendation gap                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Chest and pressing        | Incline Push-Up, Parallel-Bar Dip, Pec Deck Fly                                      | Adds scalable home, station, and stable isolation alternatives instead of presenting a low-fit press as equivalent. |
| Shoulders                 | Machine Shoulder Press, Dumbbell Lateral Raise                                       | Adds a stable machine press and a common dumbbell side-delt line when cable equipment is absent.                    |
| Upper back and rear delts | Reverse Pec Deck, Chest-Supported Dumbbell Row, Inverted Row                         | Adds low-lumbar-load and machine/bodyweight horizontal-pull choices.                                                |
| Lats and vertical pulling | Assisted Pull-Up, Straight-Arm Cable Pulldown                                        | Adds a progression bridge and an isolation option without inventing a movement.                                     |
| Quads and unilateral legs | Barbell Front Squat, Dumbbell Step-Up, Dumbbell Walking Lunge, Machine Leg Extension | Adds squat, unilateral, and knee-extension choices for different equipment and joint/setup constraints.             |
| Glutes and hip extension  | Barbell Hip Thrust, Bodyweight Glute Bridge                                          | Adds direct hip-extension progressions distinct from hinge patterns.                                                |
| Calves                    | Standing Calf Raise, Machine Seated Calf Raise                                       | Closes the prior defect where calves had a weekly target but no direct catalog exercise.                            |
| Trunk                     | Reverse Crunch, Kneeling Cable Crunch, Side Plank, Dumbbell Suitcase Carry           | Adds flexion, lateral stability, and loaded-carry choices alongside anti-extension and anti-rotation work.          |

## Registries covered

- 19 muscles.
- 21 movement patterns, including knee extension, hip extension, plantar flexion, trunk flexion, lateral trunk stability, and loaded carry.
- 21 equipment types used by at least one production exercise.
- 22 progression families used by at least one production exercise.
- Home, gym, and travel eligibility remains explicit per exercise.
- Every exercise retains required equipment, optional equipment, setup time, transition cost, joint considerations, substitutions, instructions, common mistakes, warm-up policy, drop-set safety, Plate Math load type, and project-owned offline media.

## Alternative Finder boundary

The finder first blocks candidates that fail primary-muscle, equipment, location, limitation, recovery, duplicate, station, or time checks. Remaining candidates receive a fit score based on overlap and continuity. The score is not a probability. A low score is labeled as a limited fit and must not be presented as a like-for-like replacement.
