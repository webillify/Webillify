# Webillify development tracking

Project: **Webillify-Web-App**  
Timezone: **Asia/Kolkata (IST, UTC+05:30)**  
Initialized: **2026-07-17 16:35:25 IST**  
Last reconciled with source: **2026-07-17 18:32:35 IST**

This directory is the development source of truth for the Webillify web app. It records what was planned, what actually exists, how work was verified, what remains, and the exact task recommended for the next session.

## Start here

1. [Master-WorkSheet-Log.md](Master-WorkSheet-Log.md) — current project snapshot and navigation
2. [Project-Goals.md](Project-Goals.md) — product goal, release goals, and success criteria
3. [Module-Status.md](Module-Status.md) — evidence-backed module completion matrix
4. [Task-Backlog.md](Task-Backlog.md) — assignable tasks and recommended next task
5. [Daily-WorkSheet-Log.md](Daily-WorkSheet-Log.md) — append-only session history
6. [Completed-WorkSheet-Log.md](Completed-WorkSheet-Log.md) — completed work with evidence
7. [In-Completed-Worksheet-Log.md](In-Completed-Worksheet-Log.md) — pending, in-progress, and blocked work
8. [Phase-WorkSheet-Log.md](Phase-WorkSheet-Log.md) — Webillify delivery phases and gates
9. [Decision-Log.md](Decision-Log.md) — architecture and product decisions
10. [Risk-Issue-Log.md](Risk-Issue-Log.md) — risks, issues, mitigations, and owners
11. [Session-Template.md](Session-Template.md) — template for future work sessions

## Required update workflow

At the start of every development session:

1. Read the master sheet, current sprint, open risks, and recommended next task.
2. Set the chosen task to `IN PROGRESS`, add assignee and start timestamp.
3. Add a session entry to the daily worksheet.

Before marking a task complete:

1. Record changed files and behavior delivered.
2. Run the task's acceptance checks.
3. Store verification command and result.
4. Move the task from incomplete to complete.
5. Update module status, phase progress, master snapshot, and next task.
6. Add a completion timestamp in IST.

## Status vocabulary

| Status        | Meaning                                                |
| ------------- | ------------------------------------------------------ |
| `PLANNED`     | Accepted into backlog but not scheduled                |
| `READY`       | Requirements and dependencies are sufficient to start  |
| `IN PROGRESS` | Assigned and actively being worked                     |
| `BLOCKED`     | Cannot proceed until a recorded dependency is resolved |
| `VERIFY`      | Implementation finished; acceptance evidence pending   |
| `COMPLETE`    | Acceptance criteria and required checks passed         |
| `DEFERRED`    | Intentionally moved out of the current release         |
| `CANCELLED`   | No longer required; reason must be recorded            |

## Integrity rules

- Never mark work complete because it is described in a plan; completion requires repository evidence.
- Never rewrite or delete historical daily entries. Correct an error with a new timestamped amendment.
- Use task IDs in commits, branches, pull requests, decisions, risks, and log entries when Git is introduced.
- Timestamps use `YYYY-MM-DD HH:mm:ss IST`.
- Secrets, passwords, access tokens, customer personal data, and raw production documents must never be stored in these logs.
- The imported non-Webillify phase plan is preserved unchanged at [archive/Imported-Ageera-Phase-WorkSheet-Log.md](archive/Imported-Ageera-Phase-WorkSheet-Log.md) and is not evidence of Webillify work.
