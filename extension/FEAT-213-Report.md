# FEAT-213 Report

Date: 2026-04-14  
FEAT: FEAT-213 User Notifications + Error UX

## Section A: FEAT Evidence Packet

### 1. FEAT context for empirical review

- FEAT-213 objective:
  - Standardize user notifications and runtime/preflight error UX across all command handlers.
- Milestone context:
  - FEAT-213 follows FEAT-212 closure and completes the Milestone 3 notification consistency pass before the verification matrix and pre-package approval gate.
- Inputs reviewed before implementation:
  - FEAT-213 proposal packet in `VSCODE-EXTENSION-PROPOSAL.md`
  - Existing ad-hoc message assembly in `extension/src/commands/fileCommands.js`
  - Existing preflight block in `extension/src/extension.js`
  - Existing message builders in `extension/src/validation/inputValidation.js`
  - Runtime reason codes in `extension/src/runtime/runScriptRunner.js` and `extension/src/runtime/argumentBuilder.js`

### 2. Files changed

- extension/src/ui/notifications.js (NEW)
  - Created shared notification module with:
    - `showNotificationBySeverity(vscodeApi, severity, message)` — centralized severity dispatcher replacing per-file `showBySeverity` and hard-coded `showWarningMessage` calls.
    - `buildEligibilityPreflightMessage(validation, eligibilityState)` — preflight blocked message builder (moved from `inputValidation.js`).
    - `buildValidationBlockMessage(validation, commandLabel)` — file-context block message builder (moved from `inputValidation.js`).
    - `buildBuildFailureMessage(commandLabel, reason)` — command-build failure message with per-reason guidance lookup and deterministic fallback.
    - `buildRuntimeFailureMessage(commandLabel, reason)` — runtime-start failure message with per-reason guidance lookup and deterministic fallback.
    - `buildSuccessMessage(commandLabel)` — standardized started-success message using shared terminal name constant.
    - `BUILD_FAILURE_GUIDANCE` — reason-to-guidance mapping for all known `argumentBuilder.js` failure reasons.
    - `RUNTIME_FAILURE_GUIDANCE` — reason-to-guidance mapping for all known `runScriptRunner.js` failure reasons.

- extension/src/commands/fileCommands.js
  - Removed local `showBySeverity(...)` function.
  - Removed import of `buildFileContextBlockMessage` from `inputValidation.js`.
  - Added imports from `notifications.js`: `showNotificationBySeverity`, `buildValidationBlockMessage`, `buildBuildFailureMessage`, `buildRuntimeFailureMessage`, `buildSuccessMessage`.
  - `blockWithValidation(...)` now calls `showNotificationBySeverity` + `buildValidationBlockMessage`.
  - `executeContextCommand(...)` build-failure path now calls `buildBuildFailureMessage` (was ad-hoc string with no per-reason guidance).
  - `executeContextCommand(...)` runtime-failure path now calls `buildRuntimeFailureMessage` (was ad-hoc string with no guidance at all).
  - `executeContextCommand(...)` success path now calls `showNotificationBySeverity` with `buildSuccessMessage` fallback (was direct `showInformationMessage`).

- extension/src/extension.js
  - Removed import of `buildEligibilityBlockMessage` from `inputValidation.js`.
  - Added imports from `notifications.js`: `showNotificationBySeverity`, `buildEligibilityPreflightMessage`.
  - `runWithPreflightGuard(...)` now uses `showNotificationBySeverity` with `validation.severity` instead of hard-coded `showWarningMessage`.

- extension/src/validation/inputValidation.js
  - Removed `buildEligibilityBlockMessage(...)` function and export.
  - Removed `buildFileContextBlockMessage(...)` function and export.
  - Added `severity` field to all `validateEligibilityForExecution(...)` return paths: `"error"` for missing state, `"info"` for eligible, `"warning"` for ineligible.
  - Reclassified `unsupported-language` validation severity from `"info"` to `"warning"` (approved scope decision).

### 3. Commands executed

- command:
  - diagnostics on all four FEAT-213 touched files.
  - observed output: no errors found in `notifications.js`, `fileCommands.js`, `extension.js`, `inputValidation.js`.
- command:
  - stale-pattern scan for removed helpers and old ad-hoc patterns.
  - observed output: no matches for `showBySeverity`, `buildEligibilityBlockMessage`, `buildFileContextBlockMessage`, `buildActiveFileValidationMessage`.
- command:
  - ad-hoc notification scan (direct `show*Message` calls outside `notifications.js`).
  - observed output: only remaining direct call is the placeholder stub in `registerCommands.js` (out of FEAT-213 scope).
- command:
  - FEAT-213 verification harness (inline Node.js).
  - observed output:
    - `[preflight:missing] severity=error` with guidance
    - `[preflight:ineligible] severity=warning` with guidance
    - `[preflight:eligible] severity=info allowed=true`
    - `[validation] All 40 label×reason combos OK`
    - `[severity] unsupported-language severity=warning (expected=warning)`
    - `[build-failure] All 6 reason codes produce guidance`
    - `[runtime-failure] All 8 reason codes produce guidance`
    - `[success] All 8 command family success messages OK`
    - `[dispatcher] info=true warning=true error=true`
    - `FEAT-213 verification: ALL PASS`

### 4. Verification matrix (closure state)

| Scenario | Automated evidence | Manual/code-review evidence | Final status |
| --- | --- | --- | --- |
| Preflight eligibility blocked uses shared severity dispatch | severity=error/warning verified in harness | Code review | Pass |
| Preflight message includes reason, root, markers, canary, guidance | Full message captured in harness output | Code review | Pass |
| Validation block messages retain command-accurate labels (8 families × 5 reasons) | 40/40 label×reason combos passed | Code review | Pass |
| Build-failure messages include per-reason guidance | 6/6 build reason codes verified (including unknown fallback) | Code review | Pass |
| Runtime-failure messages include per-reason guidance | 8/8 runtime reason codes verified (including unknown fallback) | Code review | Pass |
| Success messages consistent across all command families | 8/8 success messages structurally verified | Code review | Pass |
| Severity dispatcher routes info/warning/error correctly | 3/3 severity levels verified | Code review | Pass |
| Unsupported-language severity reclassified to warning | `severity=warning` confirmed in harness | Code review | Pass |
| No stale ad-hoc message patterns remain in covered call sites | Stale-pattern scan returns 0 matches | Code review | Pass |
| All touched files compile cleanly | Diagnostics: 0 errors across 4 files | Code review | Pass |

Evidence quality tier at closure:

- tier: `E3`
- rationale: targeted implementation diffs + deterministic verification outputs + diagnostics clean + explicit reviewer approval.

### 5. Acceptance criteria mapping

| FEAT-213 criterion | Expected | Observed evidence | Pass/fail |
| --- | --- | --- | --- |
| Preflight and runtime failures present clear, consistent messages | All user-facing messages follow `CommandLabel + outcome + reason + guidance` schema | Verified: preflight, validation-block, build-failure, runtime-failure messages all follow schema | Pass |
| Notification behavior documented and verified in manual checks | Notification module created; message builders verified in deterministic harness | `notifications.js` created; harness outputs captured | Pass |
| Reviewer approves user-facing error quality | Reviewer sign-off required | Derek approved FEAT-213 implementation | Pass |

### 6. Residual risk

- severity: `low`
  - issue: Placeholder command stub in `registerCommands.js` still uses direct `showInformationMessage` rather than the shared notification module.
  - mitigation/follow-up: Placeholder commands are expected to be removed as real handlers are implemented; the stub is not a real command notification path.
- severity: `low`
  - issue: Runtime and build guidance mappings are static; new reason codes added in future FEATs would fall through to generic fallback guidance.
  - mitigation/follow-up: Fallback guidance is always present and actionable ("Check Algorithms Runner output for details, then retry"). Future FEATs should add specific guidance entries as needed.

### 7. Approval request and recorded decision

- required approver role: Senior engineer
- recorded decision in this chat:
  - implementation approved by Derek
  - scope decisions approved: preflight + command modules included; unsupported-language severity reclassified to warning

### 8. Evidence location

- artifact path:
  - extension/FEAT-213-Report.md
- implementation artifacts:
  - extension/src/ui/notifications.js (new)
  - extension/src/commands/fileCommands.js
  - extension/src/extension.js
  - extension/src/validation/inputValidation.js
- related prior artifacts:
  - extension/FEAT-212-Report.md

## Section B: Post-Approval Empirical Process Report

### 1. FEAT identity recap

- FEAT-213 User Notifications + Error UX

### 2. What happened in this FEAT and what was accomplished

1. Created `extension/src/ui/notifications.js` as the centralized notification and error UX module.
2. Migrated message builders (`buildEligibilityBlockMessage`, `buildFileContextBlockMessage`) from `inputValidation.js` to `notifications.js` with improved naming and consistent API.
3. Added per-reason guidance mappings for all known build-failure and runtime-failure reason codes, with deterministic fallback for unknown reasons.
4. Refactored `fileCommands.js` to use the shared notification module for all validation-block, build-failure, runtime-failure, and success notification paths.
5. Refactored `extension.js` preflight guard to use shared severity-aware dispatch instead of hard-coded `showWarningMessage`.
6. Reclassified `unsupported-language` validation severity from info to warning.
7. Verified all paths with deterministic harness and diagnostics.

### 3. Problems encountered and mitigations

- problem: Previous session token budget was exceeded mid-implementation, leaving verification incomplete.
  - mitigation: Resumed by assessing current file state, confirmed all phases 1–5 were complete, and executed the missing Phase 6 verification and evidence capture.
- problem: Runtime failure messages previously had no guidance at all ("failed to start. Reason: X." with no guidance field).
  - mitigation: Added `RUNTIME_FAILURE_GUIDANCE` mapping with per-reason actionable guidance and a deterministic fallback pointing users to terminal output.
- problem: Build failure messages had a single hard-coded guidance string regardless of reason.
  - mitigation: Added `BUILD_FAILURE_GUIDANCE` mapping with per-reason actionable guidance and a deterministic fallback.

### 4. Proposal precision observations in FEAT-213

- FEAT-213 packet allowed `extension/src/ui/notifications.js` (to create) and command modules for call-site integration; implementation stayed within scope.
- The packet required preserving script stderr visibility; no stderr suppression was introduced.
- Severity reclassification was an approved scope extension beyond the original packet text.

### 5. Assumptions validated during execution

- Centralizing notification builders in one module is sufficient to standardize UX across all command families and preflight.
- Per-reason guidance mappings with fallback produce actionable messages for all known and unknown failure paths.
- Adding severity to eligibility validation results allows the preflight guard to use shared severity dispatch without hard-coding.

### 6. Assumptions falsified during execution

- None. All planned assumptions held during implementation.

### 7. Evidence quality tier achieved

- achieved tier: `E3`
- rationale: deterministic harness outputs + diagnostics clean + stale-pattern scan clean + explicit reviewer approval.

## Section C: Decision Trace (What Copilot decided based on what)

| Decision | Basis used | Outcome |
| --- | --- | --- |
| Create notifications.js as single notification module | FEAT-213 packet specifies `extension/src/ui/notifications.js` | centralized module with 5 builders + 1 dispatcher + 2 guidance maps |
| Move message builders out of inputValidation.js | notification UX belongs in UI module, not validation module | cleaner separation; inputValidation.js now only validates |
| Add severity field to eligibility validation results | preflight guard was hard-coded to showWarningMessage | severity-aware dispatch for all preflight states |
| Reclassify unsupported-language from info to warning | approved scope decision; blockers should present as warnings | unsupported-language now shows as warning notification |
| Keep placeholder stub in registerCommands.js as-is | out of FEAT-213 scope; placeholder commands will be removed | no change to registerCommands.js |
| Add per-reason guidance for build and runtime failures | runtime failures previously had no guidance; build failures had one hard-coded guidance | all reason codes map to actionable guidance with deterministic fallback |

## Section D: Final Human-Gated Check Requirements (Closure)

- [X] Implementation approved.
- [X] Shared notification module created and integrated.
- [X] Preflight eligibility notifications use shared severity dispatch.
- [X] Validation-block messages retain FEAT-212 command-label accuracy.
- [X] Build-failure and runtime-failure messages include reason + guidance.
- [X] Unsupported-language severity reclassified to warning.
- [X] Diagnostics clean on all touched files.
- [X] Stale-pattern scan clean.
- [X] Reviewer approves user-facing error quality.

## Section E: Final Post-Approval Report (Manual Sign-Off Closure)

Date: 2026-04-14  
Approval authority recorded in this chat: Derek (manual approval)

### 1. Final approval statement

- FEAT-213 implementation is approved.
- User-facing notification and error UX quality is approved.
