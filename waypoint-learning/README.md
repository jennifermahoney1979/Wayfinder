# Waypoint

A private, responsive educational prototype for autistic middle schoolers. The interface has individualized homepages, student-led preference checks, eight editable learning activities, First → Then boards, timed preferred rewards, and a head-teacher workspace.

## What works

- Three fictional learner profiles with individual names, preferences, assignments, reading format, plans, and records. Each preview can be opened with `?student=alex`, `?student=sam`, or `?student=riley`.
- Topic check-ins and paired choices with both/neither/skip options. Matching uses declared interests and choice comparisons; it does not infer ability or diagnose anything.
- Teacher-editable practice in math, reading, science, and everyday planning. Reading supports include short steps, a passage, and optional device text-to-speech.
- Separate learning and reward durations per learner. Timers start explicitly, pause for breaks and when the app is hidden, and save approximately every five active seconds. Progress can also advance on finishing an activity.
- An unrestricted break control; basic breaks are not rewards. No automatic audio, alarms, or countdown pressure on answering questions.
- Teacher assignment, activity creation/editing/archive, notes, first-attempt answers, skips, optional student feedback, and per-learner plans.
- Server persistence via D1, keyed by the authenticated Site user. Every API read and write requires identity. Revision checks reject stale concurrent writes. Saved activity snapshots preserve historical and in-progress content after edits.
- Responsive tablet and phone layouts, large tap targets, keyboard focus indicators, modal focus containment, larger text and simpler display options, and a home-screen app manifest.

## Scope

This is an owner-private prototype. Student preview and teacher view are both operated by the signed-in owner. The profile selector is not a security boundary. Separate student accounts, teacher/student role permissions, school deployment agreements, and institutional data workflows are not implemented. Keep the learners fictional until those are designed and reviewed. Offline reward labels describe activities arranged by a teacher; external videos, games, and music are not embedded. This web app requires connectivity for classroom records and does not claim offline operation. Active-app timer readings are not measurements of attention or engagement.

## Implementation

Vinext/React on a Cloudflare Worker, D1 storage, Drizzle schema migrations. `.openai/hosting.json` declares the Site identity and DB binding. Sites supplies authentication and deployment.

## Validation

TypeScript type checking, production build, reducer behavior tests, and static React rendering checks passed during creation. Checks cover preference matching, learner isolation, reward triggers, repeated timer saves, stale plan rejection, immutable session content, first-attempt/skipped-question records, input validation, and archived content. Browser interaction, VoiceOver, and physical iPad testing remain to be done; no accessibility certification is claimed.

To rerun the logic/render checks after dependency setup:

```
node node_modules/typescript/bin/tsc --noEmit
mkdir -p .sites-runtime/verification
node node_modules/typescript/bin/tsc lib/model.ts lib/seed.ts lib/actions.ts app/student.tsx app/teacher.tsx app/components.tsx --outDir .sites-runtime/verification --module commonjs --moduleResolution node --target es2022 --jsx react-jsx --esModuleInterop --skipLibCheck --strict
printf '{"type":"commonjs"}\n' > .sites-runtime/verification/package.json
node tests/core.cjs
```

Use the Sites skill workflow for builds and publication. Apply schema migrations through the supported deployment flow.
