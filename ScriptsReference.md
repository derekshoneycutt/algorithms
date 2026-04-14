# Scripts Reference

> Canonical command-line reference for `run.sh` and `init.sh`.
> Source of truth for options, parameter shapes, and supported language keys used by script-driven execution flows.
>
> Owner: Senior engineer
> Last reconciled: 2026-04-12
> Completeness status: required to be exhaustive for options and supported language keys
> Drift policy: any change to script option behavior in `run.sh` or `init.sh` requires this file update in the same change.

## Scope

This document is authoritative for:

- All `run.sh` command-line options and positional modes.
- All `init.sh` command-line options and argument forms.
- All supported language keys used by `run.sh` and `init.sh` maps.
- Parameter precedence, toggle behavior, conflict behavior, and key invalid-input outcomes.

## Reconciliation Checklist

Use this checklist when updating this document:

1. Verify compact and full help text for both scripts:

- `./run.sh --help`
- `./run.sh --help-all`
- `./init.sh --help`
- `./init.sh --help-all`

1. Verify parser branches for non-help option handling in both scripts.
1. Verify language key list in `run.sh` `get_language_catalog()` and `init.sh` `supportedLanguageKeys`.
1. Verify this file changed in the same commit when option behavior changed.

## run.sh Command-Line Contract

### Invocation Patterns

- `./run.sh [--smoke-test]`
- `./run.sh [--list-languages|--list-problems|--flag=<lang>|--unflag=<lang>] [--source-profile=<profile-path>] [--check-only[=native|docker|ssh]] [--compile-only] <filename|lang|select|clean|localclean> [args...]`

### run.sh Help Options

| Option | Accepted Values | Behavior |
| --- | --- | --- |
| `--help`, `-h` | none | Shows compact help and exits `0`. |
| `--help-all` | none | Shows full help and exits `0`. |
| `--help=<topic>` | `examples`, `profile`, `execution`, `docker`, `general`, `clean` | Shows one help section; unknown topic exits `64`. |

### Execution And Simulation Options

| Option | Accepted Values | Default | Repetition | Behavior |
| --- | --- | --- | --- | --- |
| `--smoke-test` | optional forwarded smoke options | off | first parse branch; terminates flow | Runs smoke script and exits with smoke result code. |
| `--check-only` | none | off | later occurrence overrides by parser order | Simulates setup route and skips compile/run. |
| `--check-only=<route>` | `native`, `docker`, `ssh`, empty (`native`) | `native` when enabled | later occurrence overrides | Route-specific simulation; unsupported route exits `64`. |
| `--compile-only` | none | off | later occurrence overrides | Compile only; no runtime execution. |

Forwarded smoke options accepted after `--smoke-test`:

- `--langs=<space-separated-keys>`
- `--timeout=<duration>`
- `--slow-timeout=<duration>`
- `--markdown`
- `--markdown=<path>`

Unsupported argument after `--smoke-test` exits `64`.

### Quick Language Presence/Flag Options

| Option | Accepted Values | Behavior |
| --- | --- | --- |
| `--list-languages` | none | Prints language presence grid and exits `0`. |
| `--list-langauges` | none | Accepted typo alias for `--list-languages`; same behavior. |
| `--list-problems` | none | Prints missing/flagged subset and exits `0`. |
| `--flag=<lang>` | any supported language key, `all`, `none` | Updates `./.flag-lang`, prints grid, exits. |
| `--unflag=<lang>` | any supported language key, `all`, `none` | Updates `./.flag-lang`, prints grid, exits. |

Quick-mode precedence behavior:

- First quick-mode option encountered wins mode selection.
- Additional options/args are ignored with warning.

### Profile Option

| Option | Accepted Values | Behavior |
| --- | --- | --- |
| `--source-profile=<path>` | path string | Sources provided profile before run flow. |
| `--source-profile=` | empty | Disables profile sourcing override. |

Profile sourcing notes:

- Default platform profile is sourced when no override used.
- Source output log path: `$HOME/.cache/derekalgos/profile.log`.
- Fallback log path: `${TMPDIR:-/tmp}/derekalgos-profile.log`.
- Source failures do not necessarily abort execution flow.

### Positional Modes And Arguments

| Positional Value | Behavior |
| --- | --- |
| `<filename>` | Treated as source file target if not recognized as language key. |
| `<language-key>` | Language shortcut target resolution. |
| `select` | Shows language grid and prompts selection flow. |
| `clean` | Cleans local output + stdlib/archive paths (interactive unless defaults provided). |
| `localclean` | Removes local `./output` and exits. |

`clean` option forms:

- `clean --defaults`
- `clean --defaults=y`
- `clean --defaults=n`
- `clean --defaults=yes`
- `clean --defaults=no`
- `clean --defaults=y|n` (per-prompt defaults)
- Also supports `yes|no`, `yes|yes`, `no|no`

Args after the first positional target are forwarded to runtime argv where applicable.

### Invalid Input And Exit Behavior (run.sh)

- Unknown option: exits `64`.
- Unknown help topic: exits `64`.
- Unsupported smoke argument: exits `64`.
- Invalid `--check-only` route: exits `64`.
- Unknown language key for `--flag`/`--unflag`: exits `64`.

## init.sh Command-Line Contract

### init.sh Help Options

| Option | Accepted Values | Behavior |
| --- | --- | --- |
| `--help`, `-h` | none | Shows compact help and exits `0`. |
| `--help-all` | none | Shows full help and exits `0`. |
| `--help=<topic>` | `examples`, `prompt`, `set-use-only`, `env`, `docker`, `runondocker`, `runonssh` | Shows one section; unknown topic exits `64`. |

### Prompt And Scope Control

| Option | Accepted Values | Behavior |
| --- | --- | --- |
| `--interactive` | none | Enables prompts; may be provided at most once. |
| `--no-prompt` | none | Disables prompts; may be provided at most once. |
| `--set-use-only` | none | Applies only first following supported set/edit/show target. |

Prompt conflict behavior:

- Repeating `--interactive` or `--no-prompt` more than once exits `64`.
- Using both repeatedly also causes conflict via repeat checks.
- When stdin is non-tty, prompt mode defaults to off unless forced with `--interactive`.

### Toggle And Environment Update Options

| Option | Accepted Values | Default | Behavior |
| --- | --- | --- | --- |
| `--copy-icons` | none | on | Enables icon copy. |
| `--no-icons` | none | off override | Disables icon copy. |
| `--icons-to=<path>` | path | `~/.vscode/extensions/icons/` | Icon destination override. |
| `--update-environment` | none | on | Enables profile writes. |
| `--skip-environment` | none | off override | Disables profile writes. |
| `--update-profile=<file>` | non-empty path | platform profile | Target profile file override. |
| `--build-docker` | none | off | Builds Dockerfile as linux/amd64. |
| `--check-only` | none | off | Dry-run mode, no file writes. |
| `--check-env` | none | off | Read-only environment diagnostics and exits. |

Toggle precedence:

- Toggle groups are final-value-wins in parser order.

### Value Override Options (`--use-*`)

| Option | Accepted Values | Default |
| --- | --- | --- |
| `--use-timeout=<value>` | `<main>` or `-k <grace> <main>` with units `s\|m\|h\|d` | `-k 10s 2m` |
| `--use-eiffel=<value>` | `eiffelstudio`, `libertyeiffel` (case-insensitive) | `eiffelstudio` |
| `--use-gcc13=<path>` | path | `/usr/bin/` |
| `--use-gcc13name=<name>` | string | `gcc-13` |
| `--use-gxx13name=<name>` | string | `g++-13` |
| `--use-runondocker=<map>` | run-on-docker map string | preloaded map |
| `--use-runonssh=<map>` | run-on-ssh map string | empty |

Repetition behavior: final occurrence wins.

### Run Route Map Editor Options

| Option | Accepted Values | Behavior |
| --- | --- | --- |
| `--runondocker` | none | Enters docker map mode; interactive edit or non-prompt show mode. |
| `--runondocker-set=<target>=<image>` | target language key or `all` | Sets mapping; may repeat; applied in order. |
| `--runondocker-remove=<target>` | target language key or `all` | Removes mapping; may repeat; applied in order. |
| `--runonssh` | none | Enters ssh map mode; interactive edit or non-prompt show mode. |
| `--runonssh-set=<target>=<route>` | target language key or `all` | Sets mapping; may repeat; applied in order. |
| `--runonssh-remove=<target>` | target language key or `all` | Removes mapping; may repeat; applied in order. |

Route value formats for `--runonssh-set`:

- Legacy: `ssh-destination|code-dir|run-script`
- Explicit: `ssh-address|ssh-user|ssh-port|code-dir|run-script`

Deprecated/unsupported flags:

- `--runondocker-only`
- `--runonssh-only`

Both exit `64` with migration guidance.

### Exit Behavior (init.sh)

Explicit exit constants in script:

- `0` -> OK
- `65` -> setup failure
- `73` -> lock unavailable
- `74` -> IO failure
- `78` -> unsupported platform

Parser/input failures generally exit `64`.

## Supported Language Coverage Matrix (With File Extensions)

The keys below are exhaustive for current script contracts and must match both:

- `run.sh` `get_language_catalog()`
- `init.sh` `supportedLanguageKeys`
- `EDITOR-PLAN.md` Supported Languages Catalog (extension reference)

| Language Key | Extension |
| --- | --- |
| ada | adb |
| arm64asm | s |
| asm | asm |
| ballerina | bal |
| c | c |
| clojure | clj |
| cobol | cob |
| cpp | cpp |
| csharp | cs |
| d | d |
| dart | dart |
| eiffel | e |
| elixir | exs |
| erlang | erl |
| factor | factor |
| forth | fth |
| fortran | f90 |
| freebasic | bas |
| fsharp | fs |
| gleam | gleam |
| go | go |
| haskell | hs |
| haxe | hx |
| icon | icn |
| idris | idr |
| java | java |
| javascript | js |
| julia | jl |
| kit | kit |
| kotlin | kt |
| llvmir | ll |
| lua | lua |
| mercury | moo |
| mmixal | mms |
| modula3 | m3 |
| mojo | mojo |
| nasm | nasm |
| nim | nim |
| oberon | Mod |
| objectivec | m |
| ocaml | ml |
| octave | mat |
| pascal | pas |
| perl | plx |
| php | php |
| prolog | pl |
| python | py |
| r | r |
| racket | rkt |
| ruby | rb |
| rust | rs |
| scala | scala |
| scheme | scm |
| simula | sim |
| smalltalk | st |
| swift | swift |
| tcl | tcl |
| typescript | ts |
| v | v |
| visualbasic | vb |
| wat | wat |
| zig | zig |

### Coverage Blocker Rule

If any supported language key or accepted option form is missing from this document, documentation is incomplete and should be treated as blocked for reviewer sign-off.
