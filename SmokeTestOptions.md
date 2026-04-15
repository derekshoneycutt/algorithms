# Smoke Controls Proposal

## Scope
This document proposes a new sidebar section called Smoke Controls that mirrors the style and intent of the existing Run Controls, but specifically for `run.sh --smoke-test` options.

It preserves all known behavior from current parsing and forwarding logic in:
- `run.sh`
- `shlib/run-smoke-test.sh`

## Proposed Smoke Controls Section
Add a dedicated Smoke Controls section in the sidebar for smoke execution configuration.

Recommended control order in the UI:
1. Markdown (with or without path)
2. Timeouts
3. Languages

### 1) Markdown Controls (first)
Provide:
- A checkbox: Enable Markdown Report
- A text input (optional path)

Behavior mapping:
- Checked + empty path -> pass `--markdown`
- Checked + non-empty path -> pass `--markdown=<path>`
- Unchecked -> pass no markdown flag

Preserved behavior details:
- `--markdown` writes report to default `<repo>/SmokeTest.md`.
- `--markdown=<path>` supports absolute paths as-is.
- Relative paths are resolved under repository root (`<repo>/<path>`).
- Empty `--markdown=` is invalid and exits with `64` in `run-smoke-test.sh`.

### 2) Timeout Controls (second)
Provide two inputs:
- Default Timeout -> `--timeout=<dur>`
- Slow Timeout -> `--slow-timeout=<dur>`

Preserved behavior details:
- Default values in `run-smoke-test.sh`:
	- `--timeout` default is `8m`
	- `--slow-timeout` default is `20m`
- Slow timeout is currently applied to `mojo` and `ballerina`.

### 3) Language Controls (third)
Provide:
- A language grid with one checkbox per supported language key.
- A Select All action.
- A Deselect All action.

Recommendation:
- Use a compact grid layout similar to flagging/listing experiences.
- Serialize selected items to one `--langs="lang1 lang2 ..."` value.
- If all supported languages are selected, omit `--langs` entirely because that is already the default behavior.

Preserved behavior details:
- `--langs=<...>` restricts smoke execution to selected language keys.
- Value is whitespace-split by `run-smoke-test.sh` into individual language tokens.
- Typical usage example: `--langs="c cpp rust"`.
- If `--langs` is not provided, `run-smoke-test.sh` runs the full default smoke language set.

## Supported `--langs` Language Keys
Based on current smoke selection behavior (`run-smoke-test.sh` derives from `run.sh` catalog and excludes `arm64asm`):

- `ada`
- `asm`
- `ballerina`
- `c`
- `clojure`
- `cobol`
- `cpp`
- `csharp`
- `d`
- `dart`
- `eiffel`
- `elixir`
- `erlang`
- `factor`
- `forth`
- `fortran`
- `freebasic`
- `fsharp`
- `gleam`
- `go`
- `haskell`
- `haxe`
- `icon`
- `idris`
- `java`
- `javascript`
- `julia`
- `kit`
- `kotlin`
- `llvmir`
- `lua`
- `mercury`
- `mmixal`
- `modula3`
- `mojo`
- `nasm`
- `nim`
- `oberon`
- `objectivec`
- `ocaml`
- `octave`
- `pascal`
- `perl`
- `php`
- `prolog`
- `python`
- `r`
- `racket`
- `ruby`
- `rust`
- `scala`
- `scheme`
- `simula`
- `smalltalk`
- `swift`
- `tcl`
- `typescript`
- `v`
- `visualbasic`
- `wat`
- `zig`

## What `run.sh --smoke-test` accepts
In `run.sh`, once `--smoke-test` is encountered, all remaining arguments are validated and only these are allowed:

1. `--langs=<...>`
2. `--timeout=<dur>`
3. `--slow-timeout=<dur>`
4. `--markdown`
5. `--markdown=<path>`

If any other argument appears after `--smoke-test`, `run.sh` exits with usage error (exit `64`).

## Forwarding behavior
After validation, `run.sh` executes:
- `sh "$scriptDir/shlib/run-smoke-test.sh" --dir="$PWD" "$@"`

So:
- `--dir` is always injected by `run.sh` as the current working directory.
- User-provided smoke options are forwarded unchanged.
- `run.sh` exits with the smoke script's exit code.

## Validation and errors
`run.sh` smoke path errors:
- Unsupported post-`--smoke-test` argument: exit `64`
- Missing/unreadable `shlib/run-smoke-test.sh`: exit `78`

`run-smoke-test.sh` errors (forwarded back through `run.sh`):
- Unknown smoke-script argument: exit `64`
- Invalid markdown empty path: exit `64`
- Missing algorithm directory / missing repo run.sh in expected location: non-zero failure exits

## Effective user syntax through `run.sh`
Supported forms:
- `./run.sh --smoke-test`
- `./run.sh --smoke-test --langs="c cpp rust"`
- `./run.sh --smoke-test --timeout=8m --slow-timeout=20m`
- `./run.sh --smoke-test --markdown`
- `./run.sh --smoke-test --markdown=SmokeTest.md`
- Any combination of the allowed options above.

Not supported after `--smoke-test`:
- Any non-listed flag
- Positional arguments (treated as unsupported arguments)

## Final Implementation Steps
1. Verification
	- Validate Smoke Controls option mapping against `run.sh` and `shlib/run-smoke-test.sh` behavior.
	- Verify Markdown, timeout, and language controls serialize to supported smoke arguments only.
	- Verify all-languages selection omits `--langs` and uses default full language set.
2. Build and install
	- Build the updated extension package (VSIX).
	- Install the updated extension in VS Code.
