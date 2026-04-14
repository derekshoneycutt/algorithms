# FEAT-201 Report

Date: 2026-04-14  
FEAT: FEAT-201 Extension Scaffold Bootstrap

## Section A: FEAT Evidence Packet

### 1. FEAT ID and title
- FEAT-201 Extension Scaffold Bootstrap

### 2. Files changed
- extension/package.json
  - Created extension metadata, VS Code engine constraint, command contribution for `algos.runActiveFile`, and scaffold scripts.
- extension/src/extension.js
  - Created activation/deactivation baseline and wired command registration to extension lifecycle subscriptions.
- extension/src/commands/registerCommands.js
  - Registered bootstrap command `algos.runActiveFile` and scaffold-level informational handler.
- extension/.vscode/launch.json
  - Created Extension Development Host launch profile targeting `${workspaceFolder}/extension`.

### 3. Commands executed
- command: `set -e && node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('extension/package.json','utf8')); JSON.parse(fs.readFileSync('extension/.vscode/launch.json','utf8')); console.log('json-ok')"`
  - working directory: `/home/derek/source/derekshoneycutt/algorithms`
  - exit code: `0`
  - observed output: `json-ok`

### 4. Acceptance criteria check
- criterion: Extension Development Host launches from `extension/.vscode/launch.json`.
  - expected: launch profile exists and is valid for `type: extensionHost` and extension development path.
  - observed: launch profile created and structurally valid; automated JSON validation passed.
  - pass/fail: `pass` (configuration readiness), `manual-host-run pending`.
- criterion: One bootstrap command is discoverable in host Command Palette.
  - expected: `algos.runActiveFile` appears in contributed commands and is registered in extension activation path.
  - observed: command contributed in `extension/package.json` and registered in `extension/src/commands/registerCommands.js`; no diagnostics.
  - pass/fail: `pass` (registration/contribution readiness), `manual-palette-check pending`.

### 5. Residual risk
- severity: `medium`
  - mitigation or follow-up: perform manual Extension Development Host run and Command Palette discoverability check before FEAT approval close.
- severity: `low`
  - mitigation or follow-up: keep FEAT-201 handler scaffold-only to avoid leaking FEAT-202+ behavior.

### 6. Approval request
- required approver role: `Senior engineer`
- requested decision: `approved`

### 7. Evidence location
- artifact path: `extension/FEAT-201-Report.md`
- related implementation artifacts:
  - `extension/package.json`
  - `extension/src/extension.js`
  - `extension/src/commands/registerCommands.js`
  - `extension/.vscode/launch.json`

### 8. Normalization and context evidence
- source surface: `Command Palette` (bootstrap command contribution and registration)
- raw selection path: `NA` (no selection-driven execution in FEAT-201)
- normalized algorithm directory: `NA` (not in FEAT-201 scope)
- resolved repository root: `/home/derek/source/derekshoneycutt/algorithms`
- resolved script path for internal runtime (`<run-script-path>` absolute path): `NA` (not in FEAT-201 scope)
- user-facing script path display form: `NA` (not in FEAT-201 scope)
- extension logging scope evidence: scaffold-only activation/command registration; no runtime orchestration logging added.
- reject reason enum when execution is blocked/no-op: `NA`

### 9. Process linkage
- Guidance Planning Agreement location and approval record:
  - location: `/memories/session/plan.md`
  - approval record: implementation authorization provided by reviewer instruction `Start implementation`.
- FEAT-202 and later prior-EPR guidance update summary: `NA` (FEAT-201 baseline).
- Post-approval Empirical Process Report location for this FEAT:
  - `extension/FEAT-201-Report.md` (Section B)
- Ambiguity severity score and escalation decision:
  - score: `A1`
  - decision: proceeded with documented rationale; no stop-and-ask escalation required.
- Evidence quality tier achieved by this FEAT evidence set:
  - tier: `E2`
  - rationale: reproducible file-level and command-level evidence captured; disconfirming manual host checks still pending.
- Assumption register reference and disconfirming check outcomes:
  - reference: `/memories/session/plan.md`
  - outcomes: scaffold constraints validated; manual host launch and palette checks pending.
- Contradiction Resolution Record reference: `NA` (no contradiction triggered).
- Minimal-safe implementation boundary confirmation:
  - confirmed: changes limited to FEAT-201 packet files inside `extension/`; no FEAT-202+ runtime behavior introduced.

## Section B: Post-Approval Empirical Process Report

### 1. FEAT ID and title
- FEAT-201 Extension Scaffold Bootstrap

### 2. Guidance Planning Agreement used
- `/memories/session/plan.md`

### 3. Guidance elements that improved execution quality
- Strict allowed/forbidden file boundary from FEAT-201 packet reduced drift risk.
- Explicit bootstrap command choice (`algos.runActiveFile`) prevented naming churn.
- Strict verification mode forced readiness checks and residual-risk recording.

### 4. Ambiguities, drift points, or conflicts encountered
- Ambiguity: whether to keep explicit `activationEvents` when command contribution already implies activation.
- Resolution: removed explicit `activationEvents` after diagnostics warning to keep metadata minimal and clean.

### 5. Proposal sections that were insufficiently precise for this FEAT
- FEAT-201 acceptance wording confirms host launch/discoverability but does not define whether metadata readiness alone is sufficient before manual host run evidence is attached.

### 6. Proposed guidance updates for the next FEAT
- Add a mandatory verification split in FEAT evidence packets:
  - `automated readiness checks`
  - `manual host/runtime checks`
- Add explicit field in closeout packet for `manual checks pending/completed`.
- Add FEAT-specific command output capture requirement for at least one successful runtime/host interaction where applicable.

### 7. Reviewer decision for each proposed update
- automated/manual verification split: `deferred`
- explicit manual-check status field: `deferred`
- mandatory runtime/host interaction output capture: `deferred`

### 8. Assumptions validated during execution
- FEAT-201 can be completed as a scaffold-only change without implementing run.sh runtime behavior.
- Command contribution plus command registration is sufficient to establish discoverability readiness pending manual host confirmation.
- Creating only packet-authorized files can fully satisfy FEAT-201 implementation boundary.

### 9. Assumptions falsified during execution
- Initial assumption that explicit `activationEvents` was required for this scaffold quality bar.
  - falsified by diagnostics guidance indicating this is redundant with command contribution declarations.

### 10. Eagerness-pressure points observed and mitigation
- Pressure point: advancing directly into FEAT-202 behavior once command baseline was in place.
- Mitigation: hard scope boundary maintained; no runtime resolver/runner files created.

### 11. Skeptical checks that prevented drift or rework
- IDE diagnostics sweep across all FEAT-201 files.
- JSON parse validation command run for created JSON files.
- Change-scope inspection to ensure updates stayed in `extension/` and aligned with packet constraints.

### 12. Ambiguity severity score observed and escalation decision
- observed score: `A1`
- escalation decision: proceed with rationale; no mandatory stop-and-ask escalation triggered.

### 13. Evidence quality tier achieved with rationale
- tier achieved: `E2`
- rationale: reproducible artifacts and command evidence are present; full `E3` requires completed disconfirming manual host checks and contradiction outcomes where applicable.

### 14. Contradiction Resolution Record references used
- `NA`

## Section C: Decision Trace (What Copilot decided based on what)

| Decision | Basis used | Outcome |
|---|---|---|
| Implement FEAT-201 as scaffold-only | FEAT-201 packet contract and backlog scope in proposal | Created only scaffold files and registration baseline |
| Use bootstrap command `algos.runActiveFile` | User planning agreement selection | Command contributed and registered with scaffold handler |
| Keep edits confined to extension subtree | FEAT-201 allowed/forbidden file boundary | No non-extension files modified |
| Remove explicit `activationEvents` | Diagnostics warning on package metadata redundancy | Cleaner metadata and zero diagnostics |
| Classify evidence as `E2` not `E3` | Evidence quality rubric + pending manual host checks | Reported reproducible readiness with explicit pending manual checks |

## Section D: Pending Manual Evidence to Close FEAT-201

1. Launch Extension Development Host from `extension/.vscode/launch.json`.
2. Confirm command discoverability in host Command Palette for `algos.runActiveFile`.
3. Execute bootstrap command once and capture host-visible behavior.
4. Attach confirmation that protected blog/document surfaces remained unchanged.

## Section E: Post-Acceptance Addendum (Launch Profile Failure Analysis)

### 1. What went wrong in the first pass
- The initial debug profile was authored only in `extension/.vscode/launch.json`, but VS Code primarily surfaces Run/Debug configurations from the currently opened workspace root.
- When the repository root workspace was open, no root-level `.vscode/launch.json` existed, so the expected launch profile was not shown.
- The profile in `extension/.vscode/launch.json` used `--extensionDevelopmentPath=${workspaceFolder}/extension`.
  - This value is correct only when `${workspaceFolder}` is the repository root.
  - It is incorrect when opening the `extension` folder directly, where `${workspaceFolder}` already resolves to `.../extension`, causing a doubly nested, invalid path.
- Result: two opposite failure modes appeared depending on workspace opening strategy:
  - root-opened workspace: launch profile discoverability issue.
  - extension-opened workspace: Extension Development Host target path issue.

### 2. Why the first pass likely made this mistake
- The implementation focused on scaffold-local file placement (`extension/`) and assumed that keeping launch configuration colocated with extension artifacts was sufficient for VS Code discovery in all workspace modes.
- `${workspaceFolder}` semantics were treated as fixed to repository root rather than context-dependent per opened folder.
- Readiness verification relied on JSON structure validation and diagnostics, which cannot detect runtime resolution errors for extension development path or workspace discovery behavior.
- A hidden assumption was made that one launch profile could be copied across opening modes without a dual-context check.

### 3. Corrective updates applied
- Added repository-root launch profile at `.vscode/launch.json` for root workspace discoverability.
- Corrected `extension/.vscode/launch.json` to use `--extensionDevelopmentPath=${workspaceFolder}` for extension-folder-open behavior.
- Kept profile names aligned to reduce operator confusion between contexts.

### 4. Preventive proposals for future FEATs
- Add a required Debug Configuration Matrix to each extension FEAT:
  - open mode `repo root`
  - open mode `extension folder`
  - expected `${workspaceFolder}` value in each mode
  - expected `--extensionDevelopmentPath` in each mode
- Add a mandatory runtime verification checklist entry:
  - `Run profile visible in Run and Debug`
  - `Extension Development Host launches successfully`
  - perform both checks in both supported workspace opening modes.
- Introduce profile lint rules for extension debug configs:
  - if file path matches `extension/.vscode/launch.json`, reject `--extensionDevelopmentPath=${workspaceFolder}/extension`.
  - if file path matches `.vscode/launch.json` at repo root, require explicit `/extension` suffix.
- Add a short design note to extension bootstrap guidance clarifying VS Code launch profile discovery scope (active workspace root only).
- Add a pre-approval disconfirming test: intentionally switch open mode and confirm the same FEAT acceptance behavior still holds.

### 5. Process hardening recommendation
- Elevate launch profile validation from `configuration readiness` to `runtime evidence required` for FEAT closure whenever acceptance criteria reference host launch behavior.
- Treat path-resolution assumptions as explicit assumptions in the FEAT report and require one disconfirming check per assumption.
