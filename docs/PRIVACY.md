# Privacy and Repository Data Rules

Workout Conductor is local-first. The application must work without accounts, a backend database, analytics, telemetry, advertising, or cloud synchronization.

## Allowed in GitHub

- Application source code and tests
- Blank defaults and clearly synthetic fixtures
- Public exercise metadata added in approved phases
- Safe screenshots containing no personal data
- Build and deployment configuration

## Never allowed in GitHub

- Real workout history or performance records
- User backups or exported settings
- Personal notes, pain history, body measurements, or health details
- Email addresses, phone numbers, authentication material, or access tokens
- Browser storage dumps or local database files

Real user data must remain inside the user's browser unless the user explicitly exports a local backup. Exported files are user-owned and are ignored by the repository.
