# init.sh — Options Reference

`init.sh` sets up the repository environment: copies icon assets to VS Code, writes
`DEREKALGOS_*` exports to your shell profile, and optionally builds the Docker image.

**Default behaviour** when stdin is a terminal: interactive prompts are enabled.  
**Default behaviour** when stdin is piped (e.g. `curl … | sh`): prompts are disabled automatically.

---

## Non-Interactive Options

These flags drive `init.sh` without requiring any runtime input at the terminal.

### Help

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Print compact help and exit. |
| `--help-all` | Print full help for all option groups and exit. |
| `--help=<topic>` | Print one focused section and exit. Topics: `examples`, `prompt`, `set-use-only`, `env`, `docker`, `runondocker`, `runonssh`. |

### Prompt Mode Control

Both flags may be supplied at most once each; supplying either more than once is an error.

| Flag | Description |
|------|-------------|
| `--no-prompt` | Disable all interactive prompts. |
| `--interactive` | Force prompts on even when stdin is piped. |

### Dry-Run and Diagnostics

| Flag | Description |
|------|-------------|
| `--check-only` | Dry-run mode — report what would change but write no files. Also disables prompts. |
| `--check-env` | Read-only environment diagnostics: validates loaded profile values and run-on maps, then exits. Disables icons, profile update, and Docker build. |

### Icon Copy

The last occurrence of `--copy-icons` / `--no-icons` wins if both appear.

| Flag | Description |
|------|-------------|
| `--copy-icons` | Copy `icons/*.svg` to the VS Code icons folder. *(default)* |
| `--no-icons` | Skip icon copy. |
| `--icons-to=<path>` | Destination directory for icon copy. Default: `~/.vscode/extensions/icons/` |

### Profile / Environment Update

The last occurrence of `--update-environment` / `--skip-environment` wins if both appear.

| Flag | Description |
|------|-------------|
| `--update-environment` | Write `DEREKALGOS_*` exports to the shell profile. *(default)* |
| `--skip-environment` | Skip all profile updates. |
| `--update-profile=<file>` | Use this file instead of the platform-detected profile. Accepts `~/…` paths. |

### Environment Value Overrides

Each flag may appear multiple times; the last value wins.

| Flag | Description |
|------|-------------|
| `--use-timeout=<value>` | Sets `DEREKALGOS_TIMEOUT`. Format: `<duration>` or `-k <grace> <main>`. Units: `s`, `m`, `h`, `d`. Examples: `45s`, `2m`, `-k 10s 1m`. Default: `-k 10s 2m`. |
| `--use-eiffel=<value>` | Sets `DEREKALGOS_EIFFEL`. Accepted: `eiffelstudio`, `libertyeiffel` (case-insensitive). Default: `eiffelstudio`. |
| `--use-gcc13=<path>` | Sets `DEREKALGOS_GCC13` — directory containing the GCC 13 binary. Default: `/usr/bin/`. |
| `--use-gcc13name=<name>` | Sets `DEREKALGOS_GCC13NAME` — GCC 13 executable name. Default: `gcc-13`. |
| `--use-gxx13name=<name>` | Sets `DEREKALGOS_GXX13NAME` — G++ 13 executable name. Default: `g++-13`. |
| `--use-runondocker=<map>` | Replaces the entire `DEREKALGOS_RUNONDOCKER` map. Default: full per-language map routing all supported languages to `code-runner`. |
| `--use-runonssh=<map>` | Replaces the entire `DEREKALGOS_RUNONSSH` map. Default: empty. |

### Docker Build

| Flag | Description |
|------|-------------|
| `--build-docker` | Build the `code-runner` Docker image from `./Dockerfile` targeting `linux/amd64`. Default: off. |

### Run-On-Docker Map Editor

These flags modify `DEREKALGOS_RUNONDOCKER` directly. Multiple `--runondocker-set` / `--runondocker-remove` flags are applied in command-line order.

| Flag | Description |
|------|-------------|
| `--runondocker` | Enter Docker map mode. With `--no-prompt`: prints the current map. With prompts: opens interactive editor. Disables icon copy. |
| `--runondocker-set=<target>=<image>` | Set one mapping. `<target>` is a language key or `all`. |
| `--runondocker-remove=<target>` | Remove one mapping. `<target>` is a language key or `all`. |

### Run-On-SSH Map Editor

These flags modify `DEREKALGOS_RUNONSSH` directly. Multiple `--runonssh-set` / `--runonssh-remove` flags are applied in command-line order.

| Flag | Description |
|------|-------------|
| `--runonssh` | Enter SSH map mode. With `--no-prompt`: prints the current map. With prompts: opens interactive editor. Disables icon copy. |
| `--runonssh-set=<target>=<route>` | Set one mapping. `<target>` is a language key or `all`. See route formats below. |
| `--runonssh-remove=<target>` | Remove one mapping. `<target>` is a language key or `all`. |

**Route formats for `--runonssh-set`:**

| Format | Fields |
|--------|--------|
| Legacy | `ssh-destination\|code-dir\|run-script` |
| Explicit | `ssh-address\|ssh-user\|ssh-port\|code-dir\|run-script` |

- `ssh-destination` — SSH host alias, `user@host`, or hostname (legacy form only).  
- `ssh-address` — Remote IP or hostname (explicit form).  
- `ssh-user` — Remote login user.  
- `ssh-port` — Remote SSH port.  
- `code-dir` — Remote directory where source is copied and where the run command executes.  
- `run-script` — Path to `run.sh` on the remote server (absolute, or relative to `code-dir`).

Example: `--runonssh-set="python=127.0.0.1|coderun|2222|/home/coderun/codefiles|../run.sh"`

### Set-Use-Only Mode

Applies exactly one configuration change and exits without touching icons or the rest of the profile.

| Flag | Description |
|------|-------------|
| `--set-use-only` | Process only the first supported `--use-*`, `--runondocker[-set/-remove]`, or `--runonssh[-set/-remove]` flag that follows, then exit. If no following flag is provided and prompts are enabled, opens an interactive selector. |

Supported targets for `--set-use-only`: `--use-timeout`, `--use-eiffel`, `--use-gcc13`, `--use-gcc13name`, `--use-gxx13name`, `--use-runondocker`, `--use-runonssh`, `--runondocker`, `--runondocker-set`, `--runondocker-remove`, `--runonssh`, `--runonssh-set`, `--runonssh-remove`.

---

## Interactive Options

These prompts appear when running without `--no-prompt` and stdin is a terminal. Each prompt shows the current default in brackets; pressing Enter accepts it.

### Copy Icons

```
Do you wish to copy icons to VSCode local folder? [Y/n]
```
Accepts `Y`/`y` or `N`/`n`; any other input keeps the current default. A follow-up prompt then asks for the destination path:

```
Enter folder to copy icons to [~/.vscode/extensions/icons/]:
```

### Update Environment

```
Do you wish to update the environment? [Y/n]
```
Accepts `Y`/`y` or `N`/`n`.

### Environment Variable Prompts

When environment update is confirmed and not in `--runondocker` / `--runonssh` mode, each variable is prompted individually:

| Prompt | Variable set |
|--------|-------------|
| `Enter a timeout [<current>]:` | `DEREKALGOS_TIMEOUT` |
| `Enter Eiffel compiler (eiffelstudio/libertyeiffel; case-insensitive) [<current>]:` | `DEREKALGOS_EIFFEL` |
| `Enter the GCC 13 path [<current>]:` | `DEREKALGOS_GCC13` |
| `Enter the GCC 13 executable name [<current>]:` | `DEREKALGOS_GCC13NAME` |
| `Enter the G++ 13 executable name [<current>]:` | `DEREKALGOS_GXX13NAME` |

### Run-On-Docker Configuration

```
Edit DEREKALGOS_RUNONDOCKER interactively? [y/N]
```
- `Y`/`y` — Opens the full interactive Docker map editor.  
- Any other input — Prompts for the raw map string: `Enter the string of languages to run on docker [<current>]:`.

Skipped if `--runondocker` or `--runondocker-set`/`--runondocker-remove` was already used.

### Run-On-SSH Configuration

```
Edit DEREKALGOS_RUNONSSH interactively? [y/N]
```
- `Y`/`y` — Opens the full interactive SSH map editor.  
- Any other input — Prompts for the raw map string: `Enter SSH routes as lang=ssh-destination|code-dir|run-script or lang=ssh-address|ssh-user|ssh-port|code-dir|run-script [<current>]:`.

Skipped if `--runonssh` or `--runonssh-set`/`--runonssh-remove` was already used.

### Docker Build

```
Do you wish to build Dockerfile for linux/amd64 now? [y/N]
```
Accepts `Y`/`y` or `N`/`n`. Shown even if `--build-docker` was not passed on the command line, allowing an opportunistic yes. If `--build-docker` was passed, the default flips to `[Y/n]`.

---

## Exit Codes

| Code | Label | Meaning |
|------|-------|---------|
| `0` | `OK` | Success. |
| `64` | — | Bad arguments or unknown option. |
| `65` | `SETUP_FAILURE` | Setup step failed (e.g. missing Docker, missing Dockerfile). |
| `73` | `LOCK_UNAVAILABLE` | Another `init.sh` process holds the lock. |
| `74` | `IO_FAILURE` | Could not create directory or temporary file. |
| `78` | `UNSUPPORTED_PLATFORM` | Platform not supported or `shlib` loader failed. |

---

## Quick Examples

```sh
# Fully interactive (default when stdin is a terminal)
./init.sh

# Non-interactive dry run — see what would change
./init.sh --no-prompt --check-only

# Non-interactive: set one value only
./init.sh --set-use-only --use-eiffel=libertyeiffel

# Read-only environment diagnostics
./init.sh --check-env

# Enter Docker map editor non-interactively (shows current map)
./init.sh --runondocker --no-prompt

# Set one Docker mapping and save
./init.sh --runondocker-set=python=code-runner

# Set one SSH route
./init.sh --runonssh-set="python=coderun-vm|/home/coderun/codefiles|../run.sh"

# Override which profile file is written
./init.sh --update-profile=~/.bash_profile
```
