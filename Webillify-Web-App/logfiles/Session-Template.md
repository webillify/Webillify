# Development session template

Copy this block to the top of `Daily-WorkSheet-Log.md` for every session.

```markdown
## YYYY-MM-DD — Session title

Session: **HH:mm:ss–HH:mm:ss IST**
Task: **WBL-AREA-NNN — Title**
Assignee: **Name**
Status: **READY / IN PROGRESS / BLOCKED / VERIFY / COMPLETE**
Branch/PR: **Reference or N/A**

### Goal

One measurable outcome for this session.

### Starting state

- Current behavior:
- Dependencies checked:
- Open risks checked:
- Assumptions:

### Activity log

| Timestamp (IST)     | Category | Activity       | Result      |
| ------------------- | -------- | -------------- | ----------- |
| YYYY-MM-DD HH:mm:ss | FRONTEND | Work performed | IN PROGRESS |

### Files changed

- `path/file` — reason

### Acceptance evidence

| Check | Command/manual procedure    | Result    | Timestamp (IST)     |
| ----- | --------------------------- | --------- | ------------------- |
| Build | `npm run build`             | PASS/FAIL | YYYY-MM-DD HH:mm:ss |
| Tests | `npm test -- --watch=false` | PASS/FAIL | YYYY-MM-DD HH:mm:ss |

### Decisions and risks

- Decision IDs added/affected:
- Risk IDs added/affected:

### Completion

- Delivered:
- Not delivered:
- Known limitations:
- Documentation updated:

### Handoff

- Recommended next task:
- Blocker requiring user/external action:
- Exact continuation point:
```

## Completion checklist

- [ ] Task acceptance criteria checked individually
- [ ] Build/test evidence recorded
- [ ] No secret or customer-sensitive data added to logs
- [ ] Completed worksheet updated if complete
- [ ] Incomplete worksheet updated if pending/blocked
- [ ] Module status updated
- [ ] Phase status updated if its gate changed
- [ ] Decision/risk logs updated
- [ ] Master snapshot and recommended next task updated
