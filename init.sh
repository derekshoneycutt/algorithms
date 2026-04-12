#! /bin/sh

# The point of this script is to initiate the system for working with
# several parts. This doesn't do anything with the installing any compilers,
# though the docker is suggested beforehand.

# At this time, the environment variables for SSH have to be added manually,
# but this will provide a really good start.

currentPlatform=$(uname -s)
doPrompt=1
copyIcons=1
copyIconsTo=~/.vscode/extensions/icons/
updateEnvironment=1
updateProfileOverridePath=
checkOnly=0
useTimeout="-k 10s 2m"
useEiffel="eiffelstudio"
useGcc13="/usr/bin/"
useGcc13Name="gcc-13"
useGxx13Name="g++-13"
useRunOnDocker="ada=code-runner asm=code-runner ballerina=code-runner freebasic=code-runner c=code-runner clojure=code-runner cobol=code-runner cpp=code-runner csharp=code-runner d=code-runner dart=code-runner eiffel=code-runner erlang=code-runner elixir=code-runner fortran=code-runner factor=code-runner fsharp=code-runner forth=code-runner gleam=code-runner go=code-runner haskell=code-runner haxe=code-runner icon=code-runner idris=code-runner java=code-runner julia=code-runner javascript=code-runner kit=code-runner kotlin=code-runner llvmir=code-runner lua=code-runner objectivec=code-runner modula3=code-runner octave=code-runner ocaml=code-runner mmixal=code-runner oberon=code-runner mojo=code-runner mercury=code-runner nasm=code-runner nim=code-runner pascal=code-runner php=code-runner prolog=code-runner perl=code-runner python=code-runner r=code-runner ruby=code-runner racket=code-runner rust=code-runner scala=code-runner scheme=code-runner simula=code-runner smalltalk=code-runner swift=code-runner tcl=code-runner typescript=code-runner v=code-runner visualbasic=code-runner wat=code-runner zig=code-runner"
useRunOnSsh=""
supportedLanguageKeys="ada arm64asm asm ballerina c clojure cobol cpp csharp d dart eiffel elixir erlang factor forth fortran freebasic fsharp gleam go haskell haxe icon idris java javascript julia kit kotlin llvmir lua mercury mmixal modula3 mojo nasm nim oberon objectivec ocaml octave pascal perl php prolog python r racket ruby rust scala scheme simula smalltalk swift tcl typescript v visualbasic wat zig"
defaultRunOnDockerMap="$useRunOnDocker"
lockDir=""
profileTmpFile=""
runOnDockerMode=0
runOnDockerCliOps=""
runOnDockerCliModify=0
runOnSshMode=0
runOnSshCliOps=""
runOnSshCliModify=0
setUseOnly=0
setUseOnlyWaiting=0
setUseOnlyTarget=""
setUseOnlyInteractivePending=0
promptForcedOff=0
interactiveFlagCount=0
noPromptFlagCount=0

# Disable interactive prompts by default when stdin is redirected (for example,
# curl ... | sh). Users can still force prompts with --interactive.
if [ ! -t 0 ]; then
    doPrompt=0
    promptForcedOff=1
fi

exitOk=0
exitSetupFailure=65
exitLockUnavailable=73
exitIoFailure=74
exitUnsupportedPlatform=78

# Defaults above are both the initial interactive values and the fallback values
# when no existing profile export is found.

# Print compact examples first so most users can scan quickly.
print_usage_examples() {
    echo "Examples:"
    echo "  $0"
    echo "  $0 --no-prompt --check-only"
    echo "  $0 --set-use-only --use-eiffel=libertyeiffel"
    echo "  $0 --runondocker --no-prompt"
    echo "  $0 --runondocker-set=python=code-runner"
    echo "  $0 --runonssh-set=python=coderun-vm|/home/coderun/codefiles|../run.sh"
    echo "  $0 --update-profile=~/.bash_profile"
    echo ""
}

# Print only prompt-mode rules and caveats.
print_usage_prompt_section() {
    echo "Prompt mode controls (interactive is default):"
    echo "  --interactive          Keep interactive prompts enabled"
    echo "  --no-prompt            Disable interactive prompts"
    echo "      If either flag is provided more than once, init exits with an error."
    echo "      For run-on map mode flags, --no-prompt switches to non-interactive show mode."
    echo ""
}

# Print --set-use-only semantics and examples.
print_usage_set_use_only_section() {
    echo "Set one value only:"
    echo "  --set-use-only         Apply only the first following supported set/edit/show flag; ignore remaining flags"
    echo "                         Supports: --use-*, --runondocker, --runondocker-set/remove, --runonssh, --runonssh-set/remove"
    echo "                         If no following flag is provided and prompts are enabled,"
    echo "                         you will be prompted immediately to choose one --use-* value to set."
    echo "                         Example: --set-use-only --use-eiffel=libertyeiffel"
    echo ""
}

# Print icon/environment and --use-* override options.
print_usage_env_section() {
    echo "Icon copy toggle group (if both are provided, the final occurrence is applied; default: --copy-icons):"
    echo "  --copy-icons           Enable icon copy"
    echo "  --no-icons             Disable icon copy"
    echo "  --icons-to=<path>      Set icon destination path [default: $copyIconsTo]"
    echo ""
    echo "Environment update toggle group (if both are provided, the final occurrence is applied; default: --update-environment):"
    echo "  --update-environment   Enable profile environment updates"
    echo "  --skip-environment     Disable profile environment updates"
    echo "  --update-profile=<f>   Read/write DEREKALGOS vars in this profile file"
    echo "  --check-only           Dry-run mode; do not write files [default: off]"
    echo ""
    echo "Environment value overrides (if repeated, the final value is applied):"
    echo "  --use-timeout=<value>  Set DEREKALGOS_TIMEOUT value [default: $useTimeout]"
    echo "                         Format: <main-timeout> or -k <grace-timeout> <main-timeout>"
    echo "                         Units: s (seconds), m (minutes), h (hours), d (days)"
    echo "                         Examples: 45s, 2m, -k 10s 1m"
    echo "  --use-eiffel=<value>   Set DEREKALGOS_EIFFEL value [default: $useEiffel]"
    echo "                         Accepted values: eiffelstudio, libertyeiffel (case-insensitive)"
    echo "  --use-gcc13=<value>    Set DEREKALGOS_GCC13 path [default: $useGcc13]"
    echo "  --use-gcc13name=<val>  Set DEREKALGOS_GCC13NAME [default: $useGcc13Name]"
    echo "  --use-gxx13name=<val>  Set DEREKALGOS_GXX13NAME [default: $useGxx13Name]"
    echo ""
    echo "Run routing maps (if repeated, the final value is applied):"
    echo "  --use-runondocker=<v>  Set DEREKALGOS_RUNONDOCKER map [default: preloaded language map]"
    echo "  --use-runonssh=<value> Set DEREKALGOS_RUNONSSH map [default: empty; format: lang=ssh-destination|code-dir|run-script]"
    echo "                         Or explicit: lang=ssh-address|ssh-user|ssh-port|code-dir|run-script"
    echo ""
}

# Print run-on-docker map editor options.
print_usage_runondocker_section() {
    echo "Run-on-docker editor options (target only DEREKALGOS_RUNONDOCKER):"
    echo "  --runondocker              Enter run-on-docker map mode"
    echo "                             interactive default: edit map"
    echo "                             with --no-prompt: show current map"
    echo "  --runondocker-set=<t=i>    Set mapping for <target> to <image>; <target> is a language or 'all'"
    echo "  --runondocker-remove=<t>   Remove mapping for <target>; <target> is a language or 'all'"
    echo "  These may be used multiple times and are applied in command-line order."
    echo ""
}

# Print run-on-ssh map editor options and route format details.
print_usage_runonssh_section() {
    echo "Run-on-ssh editor options (target only DEREKALGOS_RUNONSSH):"
    echo "  --runonssh                 Enter run-on-ssh map mode"
    echo "                             interactive default: edit map"
    echo "                             with --no-prompt: show current map"
    echo "  --runonssh-set=<t=r>       Set mapping for <target> to <route>; <target> is a language or 'all'"
    echo "  --runonssh-remove=<t>      Remove mapping for <target>; <target> is a language or 'all'"
    echo "  <route> format (legacy): ssh-destination|code-dir|run-script"
    echo "    ssh-destination: SSH host target used by ssh/scp (host, user@host, or SSH config alias)"
    echo "  <route> format (explicit): ssh-address|ssh-user|ssh-port|code-dir|run-script"
    echo "    ssh-address: remote host/IP address (for example: 127.0.0.1)"
    echo "    ssh-user: remote login user (for example: coderun)"
    echo "    ssh-port: remote SSH port (for example: 2222)"
    echo "    code-dir: remote folder where source is copied and where the run command starts"
    echo "    run-script: remote run.sh path to execute (absolute or relative to code-dir)."
    echo "                This should be the same run.sh as this repository, but on the SSH server."
    echo "    example route (legacy): coderun-vm|/home/coderun/codefiles|../run.sh"
    echo "    example route (explicit): 127.0.0.1|coderun|2222|/home/coderun/codefiles|../run.sh"
    echo "    full example: --runonssh-set=\"python=127.0.0.1|coderun|2222|/home/coderun/codefiles|../run.sh\""
    echo "  These may be used multiple times and are applied in command-line order."
    echo ""
}

# Print compact, first-screen help for everyday usage.
print_usage_short() {
    echo "Usage: $0 [options]"
    echo ""
    print_usage_examples
    echo "Common options:"
    echo "  --help                 Show this compact help and exit"
    echo "  --help-all             Show full help and exit"
    echo "  --help=<topic>         Show one topic (examples, prompt, set-use-only, env, runondocker, runonssh)"
    echo "  --interactive          Keep interactive prompts enabled"
    echo "  --no-prompt            Disable prompts"
    echo "  --check-only           Dry-run mode; do not write files"
    echo "  --update-profile=<f>   Override which profile file gets updated"
    echo "  --set-use-only         Set only one following --use-* or run-on flag"
    echo "  --runondocker          Enter run-on-docker map mode"
    echo "  --runonssh             Enter run-on-ssh map mode"
    echo ""
    echo "For full details: $0 --help-all"
}

# Print complete help, including all option sections.
print_usage_full() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help                 Show compact help and exit"
    echo "  --help-all             Show full help and exit"
    echo "  --help=<topic>         Show one topic (examples, prompt, set-use-only, env, runondocker, runonssh)"
    echo ""
    print_usage_examples
    print_usage_prompt_section
    print_usage_set_use_only_section
    print_usage_env_section
    print_usage_runondocker_section
    print_usage_runonssh_section
    echo "Note: option names are '--use-runondocker' and '--use-runonssh'."
    echo "Unknown arguments are reported and cause exit code 64."
}

# Print one focused help section selected by topic.
print_usage_topic() {
    case "$1" in
        examples) print_usage_examples ;;
        prompt) print_usage_prompt_section ;;
        set-use-only) print_usage_set_use_only_section ;;
        env) print_usage_env_section ;;
        runondocker) print_usage_runondocker_section ;;
        runonssh) print_usage_runonssh_section ;;
        *)
            echo "Unknown help topic: $1" >&2
            topicSuggestion=$(suggest_help_topic_for_unknown "$1")
            if [ -n "$topicSuggestion" ]; then
                echo "Did you mean: $topicSuggestion" >&2
            fi
            echo "Supported topics: examples, prompt, set-use-only, env, runondocker, runonssh" >&2
            return 1
            ;;
    esac
}

# Backward-compatible default help entry point.
print_usage() {
    print_usage_short
}

# Print supported option keys for did-you-mean matching.
print_option_catalog() {
    cat <<'EOF'
--interactive
--no-prompt
--set-use-only
--copy-icons
--no-icons
--icons-to=
--update-environment
--skip-environment
--update-profile=
--check-only
--runondocker
--runonssh
--runondocker-set=
--runonssh-set=
--runondocker-remove=
--runonssh-remove=
--help
-h
--help-all
--help=
--use-timeout=
--use-eiffel=
--use-gcc13=
--use-gcc13name=
--use-gxx13name=
--use-runondocker=
--use-runonssh=
EOF
}

# Print supported help topics for did-you-mean matching.
print_help_topic_catalog() {
    cat <<'EOF'
examples
prompt
set-use-only
env
runondocker
runonssh
EOF
}

# Normalize one option token for matching by dropping values after '='.
normalize_option_token() {
    case "$1" in
        --*=*) printf '%s\n' "${1%%=*}=" ;;
        *) printf '%s\n' "$1" ;;
    esac
}

# Suggest one closest token from a newline-separated catalog.
suggest_from_catalog() {
    suggestTarget="$1"
    suggestCatalog="$2"
    printf '%s\n' "$suggestCatalog" | awk -v target="$suggestTarget" '
        function min3(a, b, c, m) { m = a; if (b < m) m = b; if (c < m) m = c; return m }
        function dist(s, t, i, j, ls, lt, cost, prev, tmp, cur) {
            ls = length(s); lt = length(t)
            for (j = 0; j <= lt; j++) d[j] = j
            for (i = 1; i <= ls; i++) {
                prev = d[0]
                d[0] = i
                for (j = 1; j <= lt; j++) {
                    tmp = d[j]
                    cost = (substr(s, i, 1) == substr(t, j, 1)) ? 0 : 1
                    cur = min3(d[j] + 1, d[j - 1] + 1, prev + cost)
                    d[j] = cur
                    prev = tmp
                }
            }
            return d[lt]
        }
        {
            if ($0 == "") next
            if (index($0, target) == 1 || index(target, $0) == 1) {
                print $0
                exit
            }
            score = dist(target, $0)
            if (best == "" || score < bestScore) {
                best = $0
                bestScore = score
            }
        }
        END {
            if (best != "" && bestScore <= 4) print best
        }'
}

# Suggest the closest option for an unknown option token.
suggest_option_for_unknown() {
    unknownOption="$1"
    normalizedOption=$(normalize_option_token "$unknownOption")
    optionCatalog=$(print_option_catalog)
    suggest_from_catalog "$normalizedOption" "$optionCatalog" | head -n 1
}

# Suggest the closest help topic for unknown topic values.
suggest_help_topic_for_unknown() {
    unknownTopic="$1"
    topicCatalog=$(print_help_topic_catalog)
    suggest_from_catalog "$unknownTopic" "$topicCatalog" | head -n 1
}

# Map exit codes to short labels for final diagnostics.
exit_label_for_code() {
    case "$1" in
        "$exitOk") printf '%s\n' "OK" ;;
        "$exitSetupFailure") printf '%s\n' "SETUP_FAILURE" ;;
        "$exitLockUnavailable") printf '%s\n' "LOCK_UNAVAILABLE" ;;
        "$exitIoFailure") printf '%s\n' "IO_FAILURE" ;;
        "$exitUnsupportedPlatform") printf '%s\n' "UNSUPPORTED_PLATFORM" ;;
        129) printf '%s\n' "TERMINATED_HUP" ;;
        130) printf '%s\n' "TERMINATED_INT" ;;
        143) printf '%s\n' "TERMINATED_TERM" ;;
        *) printf '%s\n' "ERROR" ;;
    esac
}

# Print one-line non-zero exit diagnostics after cleanup.
print_exit_diagnostic() {
    exit_code="$1"
    if [ "$exit_code" -eq 0 ]; then
        return
    fi
    exit_label=$(exit_label_for_code "$exit_code")
    exit_message="init.sh failed [$exit_label] (exit $exit_code)"
    if command -v date > /dev/null 2>&1; then
        exit_time=$(date '+%Y-%m-%d %H:%M:%S %Z')
    else
        exit_time="unknown-time"
    fi
    mkdir -p ./output 2>/dev/null
    echo "[$exit_time] $exit_message" >> ./output/init-last 2>/dev/null
    if [ "$exit_code" -ne 64 ]; then
        echo "$exit_message" >&2
    fi
}

# Prompt the user with a default and return either input or fallback.
read_user_input() {
    if [ -r /dev/tty ]; then
        IFS= read -r input_value < /dev/tty || input_value=""
    else
        IFS= read -r input_value || input_value=""
    fi
    printf '%s\n' "$input_value"
}

# Prompt the user with a default and return either input or fallback.
prompt_with_default() {
    prompt_text="$1"
    default_value="$2"
    printf "%s [%s]: " "$prompt_text" "$default_value" >&2
    input_value=$(read_user_input)
    if [ -n "$input_value" ]; then
        printf '%s\n' "$input_value"
    else
        printf '%s\n' "$default_value"
    fi
}

# Flatten values for safe single-line profile exports.
escape_profile_value() {
    # Flatten newlines to spaces and escape backslashes/double-quotes.
    printf '%s' "$1" | sed ':a;N;$!ba;s/\n/ /g;s/[\\"]/\\&/g'
}

# Normalize literal ~/ paths so quoted mkdir/cp targets still resolve to HOME.
expand_home_path() {
    path_value="$1"
    case "$path_value" in
        "$HOME"/\~)
            printf '%s\n' "$HOME"
            ;;
        "$HOME"/\~/*)
            printf '%s/%s\n' "$HOME" "${path_value#"$HOME"/\~/}"
            ;;
        \~)
            printf '%s\n' "$HOME"
            ;;
        \~/*)
            printf '%s/%s\n' "$HOME" "${path_value#\~/}"
            ;;
        *)
            printf '%s\n' "$path_value"
            ;;
    esac
}

# Create temp files safely even without mktemp by using noclobber retries.
make_temp_file_secure() {
    temp_label="$1"
    temp_base_dir="$2"
    if [ -z "$temp_base_dir" ]; then
        temp_base_dir="${TMPDIR:-/tmp}"
    fi

    if command -v mktemp > /dev/null 2>&1; then
        mktemp "${temp_base_dir%/}/derekalgos-${temp_label}.XXXXXX"
        return "$?"
    fi

    temp_idx=0
    temp_max_tries=128
    while [ "$temp_idx" -lt "$temp_max_tries" ]; do
        temp_candidate="${temp_base_dir%/}/derekalgos-${temp_label}.$$.$temp_idx"
        ( set -C; : > "$temp_candidate" ) 2>/dev/null && {
            printf '%s\n' "$temp_candidate"
            return 0
        }
        temp_idx=$((temp_idx + 1))
    done

    return 1
}

# Pick the default shell profile used by run.sh for this OS.
determine_profile_for_platform() {
    case "$currentPlatform" in
        "MINGW64_NT"*) printf '%s\n' ~/.bash_profile ;;
        "Linux"*) printf '%s\n' ~/.bash_profile ;;
        "FreeBSD") printf '%s\n' ~/.profile ;;
        "Darwin") printf '%s\n' ~/.zprofile ;;
        *) printf '%s\n' "" ;;
    esac
}

# Read a previously exported DEREKALGOS value from profile text.
get_profile_export_value() {
    var_name="$1"
    profile_file="$2"
    if [ ! -f "$profile_file" ]; then
        return
    fi
    raw_value=$(sed -n "s/^export ${var_name}=//p" "$profile_file" | tail -n 1)
    if [ -z "$raw_value" ]; then
        return
    fi
    case "$raw_value" in
        \"*\")
            raw_value=${raw_value#\"}
            raw_value=${raw_value%\"}
            raw_value=$(printf '%s' "$raw_value" | sed 's/\\"/"/g;s/\\\\/\\/g')
            ;;
    esac
    printf '%s\n' "$raw_value"
}

# Pull existing profile values so updates preserve current settings by default.
load_existing_defaults_from_profile() {
    profile_file="$1"
    loaded_value=$(get_profile_export_value "DEREKALGOS_TIMEOUT" "$profile_file")
    if [ -n "$loaded_value" ]; then useTimeout="$loaded_value"; fi
    loaded_value=$(get_profile_export_value "DEREKALGOS_EIFFEL" "$profile_file")
    if [ -n "$loaded_value" ]; then useEiffel="$loaded_value"; fi
    loaded_value=$(get_profile_export_value "DEREKALGOS_GCC13" "$profile_file")
    if [ -n "$loaded_value" ]; then useGcc13="$loaded_value"; fi
    loaded_value=$(get_profile_export_value "DEREKALGOS_GCC13NAME" "$profile_file")
    if [ -n "$loaded_value" ]; then useGcc13Name="$loaded_value"; fi
    loaded_value=$(get_profile_export_value "DEREKALGOS_GXX13NAME" "$profile_file")
    if [ -n "$loaded_value" ]; then useGxx13Name="$loaded_value"; fi
    loaded_value=$(get_profile_export_value "DEREKALGOS_RUNONDOCKER" "$profile_file")
    if [ -n "$loaded_value" ]; then useRunOnDocker="$loaded_value"; fi
    loaded_value=$(get_profile_export_value "DEREKALGOS_RUNONSSH" "$profile_file")
    if [ -n "$loaded_value" ]; then useRunOnSsh="$loaded_value"; fi
}

# The helpers below treat DEREKALGOS_RUNONDOCKER as a simple space-separated
# key=value map. The algorithms are intentionally standard: scan, rebuild, and
# preserve command-line order when replaying edits.

# Emit the supported language key list for run-on-docker mappings.
runondocker_language_list() {
    for lang_key in $supportedLanguageKeys; do
        printf '%s\n' "$lang_key"
    done
}

# Return terminal width for compact column formatting, with safe fallback.
get_display_columns() {
    display_cols=""
    if command -v tput > /dev/null 2>&1; then
        display_cols=$(tput cols 2>/dev/null)
    fi
    if [ -z "$display_cols" ] && [ -n "$COLUMNS" ]; then
        display_cols="$COLUMNS"
    fi
    case "$display_cols" in
        ''|*[!0-9]*) display_cols=80 ;;
    esac
    if [ "$display_cols" -lt 40 ]; then
        display_cols=40
    fi
    printf '%s\n' "$display_cols"
}

# Print supported language keys in compact wrapped columns.
print_supported_language_keys_grid() {
    max_key_len=0
    for lang_key in $(runondocker_language_list); do
        key_len=${#lang_key}
        if [ "$key_len" -gt "$max_key_len" ]; then
            max_key_len="$key_len"
        fi
    done

    col_width=$((max_key_len + 3))
    display_cols=$(get_display_columns)
    cols_per_row=$((display_cols / col_width))
    if [ "$cols_per_row" -lt 1 ]; then
        cols_per_row=1
    fi

    current_col=0
    for lang_key in $(runondocker_language_list); do
        printf "  %-*s" "$col_width" "$lang_key"
        current_col=$((current_col + 1))
        if [ "$current_col" -ge "$cols_per_row" ]; then
            printf '\n'
            current_col=0
        fi
    done
    if [ "$current_col" -ne 0 ]; then
        printf '\n'
    fi
}

# Print only currently configured run-on-docker mappings.
print_runondocker_configured_mappings() {
    has_mapping=0
    for lang_key in $(runondocker_language_list); do
        img_value=$(runondocker_get_image_for_lang "$useRunOnDocker" "$lang_key")
        if [ -n "$img_value" ]; then
            echo "  $lang_key=$img_value"
            has_mapping=1
        fi
    done
    if [ "$has_mapping" -eq 0 ]; then
        echo "  <none>"
    fi
}

# Print only currently configured run-on-ssh mappings.
print_runonssh_configured_mappings() {
    has_mapping=0
    for lang_key in $(runondocker_language_list); do
        route_value=$(runonssh_get_route_for_lang "$useRunOnSsh" "$lang_key")
        if [ -n "$route_value" ]; then
            echo "  $lang_key=$route_value"
            has_mapping=1
        fi
    done
    if [ "$has_mapping" -eq 0 ]; then
        echo "  <none>"
    fi
}

# Print all supported languages with their current run-on-docker mapping or <unset>.
print_runondocker_all_mappings() {
    for lang_key in $(runondocker_language_list); do
        img_value=$(runondocker_get_image_for_lang "$useRunOnDocker" "$lang_key")
        if [ -n "$img_value" ]; then
            echo "  $lang_key=$img_value"
        else
            echo "  $lang_key=<unset>"
        fi
    done
}

# Print all supported languages with their current run-on-ssh mapping or <unset>.
print_runonssh_all_mappings() {
    for lang_key in $(runondocker_language_list); do
        route_value=$(runonssh_get_route_for_lang "$useRunOnSsh" "$lang_key")
        if [ -n "$route_value" ]; then
            echo "  $lang_key=$route_value"
        else
            echo "  $lang_key=<unset>"
        fi
    done
}

# Check whether a run-on-docker language key is known.
is_known_runondocker_language() {
    target_lang="$1"
    for known_lang in $(runondocker_language_list); do
        if [ "$known_lang" = "$target_lang" ]; then
            return 0
        fi
    done
    return 1
}

# Append one ordered run-on-docker CLI operation for later replay.
append_runondocker_cli_op() {
    op_kind="$1"
    op_value="$2"
    if [ -n "$runOnDockerCliOps" ]; then
        runOnDockerCliOps="$runOnDockerCliOps
$op_kind|$op_value"
    else
        runOnDockerCliOps="$op_kind|$op_value"
    fi
}

# Append one ordered run-on-ssh CLI operation for later replay.
append_runonssh_cli_op() {
    op_kind="$1"
    op_value="$2"
    if [ -n "$runOnSshCliOps" ]; then
        runOnSshCliOps="$runOnSshCliOps
$op_kind|$op_value"
    else
        runOnSshCliOps="$op_kind|$op_value"
    fi
}

# Resolve image value for one language key from a mapping string.
runondocker_get_image_for_lang() {
    map_string="$1"
    target_lang="$2"
    for pair in $map_string; do
        pair_lang=${pair%%=*}
        if [ "$pair_lang" = "$target_lang" ]; then
            printf '%s\n' "${pair#*=}"
            return
        fi
    done
}

# Resolve SSH route value for one language key from a mapping string.
runonssh_get_route_for_lang() {
    map_string="$1"
    target_lang="$2"
    for pair in $map_string; do
        pair_lang=${pair%%=*}
        if [ "$pair_lang" = "$target_lang" ]; then
            printf '%s\n' "${pair#*=}"
            return
        fi
    done
}

# Remove one language key from a mapping string.
runondocker_remove_lang() {
    map_string="$1"
    target_lang="$2"
    next_map=""
    for pair in $map_string; do
        pair_lang=${pair%%=*}
        if [ "$pair_lang" = "$target_lang" ]; then
            continue
        fi
        if [ -n "$next_map" ]; then
            next_map="$next_map $pair"
        else
            next_map="$pair"
        fi
    done
    printf '%s\n' "$next_map"
}

# Remove one language key from the SSH routing string.
runonssh_remove_lang() {
    map_string="$1"
    target_lang="$2"
    next_map=""
    for pair in $map_string; do
        pair_lang=${pair%%=*}
        if [ "$pair_lang" = "$target_lang" ]; then
            continue
        fi
        if [ -n "$next_map" ]; then
            next_map="$next_map $pair"
        else
            next_map="$pair"
        fi
    done
    printf '%s\n' "$next_map"
}

# Set one language key to an image in a mapping string.
runondocker_set_lang() {
    map_string="$1"
    target_lang="$2"
    target_image="$3"
    base_map=$(runondocker_remove_lang "$map_string" "$target_lang")
    if [ -z "$target_image" ]; then
        printf '%s\n' "$base_map"
        return
    fi
    if [ -n "$base_map" ]; then
        printf '%s\n' "$base_map $target_lang=$target_image"
    else
        printf '%s\n' "$target_lang=$target_image"
    fi
}

# Validate one inline SSH route definition.
is_valid_runonssh_route() {
    route_value="$1"
    route_field_count=$(printf '%s' "$route_value" | awk -F'|' '{print NF}')
    case "$route_field_count" in
        3)
            route_destination=${route_value%%|*}
            route_rest=${route_value#*|}
            route_codedir=${route_rest%%|*}
            route_runscript=${route_rest#*|}

            if [ -z "$route_destination" ] || [ -z "$route_codedir" ] || [ -z "$route_runscript" ]; then
                return 1
            fi
            ;;
        5)
            route_address=${route_value%%|*}
            route_rest=${route_value#*|}
            route_user=${route_rest%%|*}
            route_rest=${route_rest#*|}
            route_port=${route_rest%%|*}
            route_rest=${route_rest#*|}
            route_codedir=${route_rest%%|*}
            route_runscript=${route_rest#*|}

            if [ -z "$route_address" ] || [ -z "$route_user" ] || [ -z "$route_port" ] || [ -z "$route_codedir" ] || [ -z "$route_runscript" ]; then
                return 1
            fi
            case "$route_port" in
                *[!0-9]*|'') return 1 ;;
            esac
            ;;
        *)
            return 1
            ;;
    esac

    return 0
}

# Set one language key to an SSH route in a mapping string.
runonssh_set_lang() {
    map_string="$1"
    target_lang="$2"
    target_route="$3"
    base_map=$(runonssh_remove_lang "$map_string" "$target_lang")
    if [ -z "$target_route" ]; then
        printf '%s\n' "$base_map"
        return
    fi
    if [ -n "$base_map" ]; then
        printf '%s\n' "$base_map $target_lang=$target_route"
    else
        printf '%s\n' "$target_lang=$target_route"
    fi
}

# Set all known languages to one image (or clear all when image is empty).
runondocker_set_all() {
    target_image="$1"
    if [ -z "$target_image" ]; then
        printf '%s\n' ""
        return
    fi
    all_map=""
    for lang_key in $(runondocker_language_list); do
        if [ -n "$all_map" ]; then
            all_map="$all_map $lang_key=$target_image"
        else
            all_map="$lang_key=$target_image"
        fi
    done
    printf '%s\n' "$all_map"
}

# Set all known languages to one SSH route (or clear all when route is empty).
runonssh_set_all() {
    target_route="$1"
    if [ -z "$target_route" ]; then
        printf '%s\n' ""
        return
    fi
    all_map=""
    for lang_key in $(runondocker_language_list); do
        if [ -n "$all_map" ]; then
            all_map="$all_map $lang_key=$target_route"
        else
            all_map="$lang_key=$target_route"
        fi
    done
    printf '%s\n' "$all_map"
}

# Print current mapping for every supported language.
show_runondocker_map() {
    echo "Current DEREKALGOS_RUNONDOCKER settings:"
    echo "Supported language keys:"
    print_supported_language_keys_grid
    echo "Configured mappings:"
    print_runondocker_configured_mappings
}

# Print current SSH routing for every supported language.
show_runonssh_map() {
    echo "Current DEREKALGOS_RUNONSSH settings:"
    echo "Supported language keys:"
    print_supported_language_keys_grid
    echo "Configured mappings:"
    print_runonssh_configured_mappings
}

# Apply non-interactive set/remove command-line edits to run-on-docker map.
apply_runondocker_cli_changes() {
    if [ -z "$runOnDockerCliOps" ]; then
        return
    fi

    while IFS= read -r op_entry; do
        if [ -z "$op_entry" ]; then
            continue
        fi
        op_kind=${op_entry%%|*}
        op_value=${op_entry#*|}
        case "$op_kind" in
            replace)
                useRunOnDocker="$op_value"
                ;;
            remove)
                case "$op_value" in
                    all)
                        useRunOnDocker=""
                        ;;
                    *)
                        if ! is_known_runondocker_language "$op_value"; then
                            echo "Unknown runondocker remove target: $op_value" >&2
                            exit 64
                        fi
                        useRunOnDocker=$(runondocker_remove_lang "$useRunOnDocker" "$op_value")
                        ;;
                esac
                ;;
            set)
                set_target=${op_value%%=*}
                if [ "$set_target" = "$op_value" ]; then
                    echo "Invalid --runondocker-set format. Expected <target>=<image>." >&2
                    exit 64
                fi
                set_image=${op_value#*=}
                if [ -z "$set_target" ] || [ -z "$set_image" ]; then
                    echo "Invalid --runondocker-set format. Expected non-empty <target>=<image>." >&2
                    exit 64
                fi
                case "$set_target" in
                    all)
                        useRunOnDocker=$(runondocker_set_all "$set_image")
                        ;;
                    *)
                        if ! is_known_runondocker_language "$set_target"; then
                            echo "Unknown runondocker set target: $set_target" >&2
                            exit 64
                        fi
                        useRunOnDocker=$(runondocker_set_lang "$useRunOnDocker" "$set_target" "$set_image")
                        ;;
                esac
                ;;
        esac
    done <<EOF
$runOnDockerCliOps
EOF
}

# Apply non-interactive set/remove command-line edits to run-on-ssh map.
apply_runonssh_cli_changes() {
    if [ -z "$runOnSshCliOps" ]; then
        return
    fi

    while IFS= read -r op_entry; do
        if [ -z "$op_entry" ]; then
            continue
        fi
        op_kind=${op_entry%%|*}
        op_value=${op_entry#*|}
        case "$op_kind" in
            replace)
                useRunOnSsh="$op_value"
                ;;
            remove)
                case "$op_value" in
                    all)
                        useRunOnSsh=""
                        ;;
                    *)
                        if ! is_known_runondocker_language "$op_value"; then
                            echo "Unknown runonssh remove target: $op_value" >&2
                            exit 64
                        fi
                        useRunOnSsh=$(runonssh_remove_lang "$useRunOnSsh" "$op_value")
                        ;;
                esac
                ;;
            set)
                set_target=${op_value%%=*}
                if [ "$set_target" = "$op_value" ]; then
                    echo "Invalid --runonssh-set format. Expected <target>=<route>." >&2
                    exit 64
                fi
                set_route=${op_value#*=}
                if [ -z "$set_target" ] || [ -z "$set_route" ]; then
                    echo "Invalid --runonssh-set format. Expected non-empty <target>=<route>." >&2
                    exit 64
                fi
                if ! is_valid_runonssh_route "$set_route"; then
                    echo "Invalid runonssh route '$set_route'. Expected ssh-destination|code-dir|run-script or ssh-address|ssh-user|ssh-port|code-dir|run-script." >&2
                    exit 64
                fi
                case "$set_target" in
                    all)
                        useRunOnSsh=$(runonssh_set_all "$set_route")
                        ;;
                    *)
                        if ! is_known_runondocker_language "$set_target"; then
                            echo "Unknown runonssh set target: $set_target" >&2
                            exit 64
                        fi
                        useRunOnSsh=$(runonssh_set_lang "$useRunOnSsh" "$set_target" "$set_route")
                        ;;
                esac
                ;;
        esac
    done <<EOF
$runOnSshCliOps
EOF
}

# Prompt-driven editor for run-on-docker map (language/all set/remove/show).
edit_runondocker_interactive() {
    echo ""
    echo "Run-on-docker interactive editor"
    echo "  ENTER accepts defaults shown in [brackets]."
    echo "  Type 'done' (or press ENTER at language prompt) to exit editor."
    echo "  Type 'show' at language prompt to view all languages and their current mappings."
    echo "  Supported language keys:"
    print_supported_language_keys_grid
    echo ""
    all_default=$(prompt_with_default "Initial all-language action image (type 'skip' to keep existing map, 'none' to clear all)" "skip")
    case "$all_default" in
        skip|SKIP)
            ;;
        none|NONE)
            useRunOnDocker=""
            ;;
        *)
            useRunOnDocker=$(runondocker_set_all "$all_default")
            ;;
    esac

    while :; do
        echo ""
        target_lang=$(prompt_with_default "Language to edit (name/all/show/done; ENTER=done)" "done")
        case "$target_lang" in
            done|DONE)
                break
                ;;
            show|SHOW)
                echo "All run-on-docker mappings:"
                print_runondocker_all_mappings
                continue
                ;;
            all|ALL)
                action=$(prompt_with_default "Action for all languages (set/remove/skip)" "set")
                case "$action" in
                    remove|REMOVE)
                        useRunOnDocker=""
                        ;;
                    set|SET)
                        all_image=$(prompt_with_default "Docker image for all languages" "code-runner")
                        if [ -n "$all_image" ]; then
                            useRunOnDocker=$(runondocker_set_all "$all_image")
                        fi
                        ;;
                    *) ;;
                esac
                ;;
            *)
                if ! is_known_runondocker_language "$target_lang"; then
                    echo "Unknown language '$target_lang'. Use 'show' to view available keys."
                    continue
                fi
                current_image=$(runondocker_get_image_for_lang "$useRunOnDocker" "$target_lang")
                if [ -z "$current_image" ]; then
                    current_image="code-runner"
                fi
                action=$(prompt_with_default "Action for $target_lang (set/remove/skip)" "set")
                case "$action" in
                    remove|REMOVE)
                        useRunOnDocker=$(runondocker_remove_lang "$useRunOnDocker" "$target_lang")
                        ;;
                    set|SET)
                        image_name=$(prompt_with_default "Docker image for $target_lang" "$current_image")
                        if [ -n "$image_name" ]; then
                            useRunOnDocker=$(runondocker_set_lang "$useRunOnDocker" "$target_lang" "$image_name")
                        fi
                        ;;
                    *) ;;
                esac
                ;;
        esac
    done
}

# Prompt-driven editor for run-on-ssh map (language/all set/remove/show).
edit_runonssh_interactive() {
    echo ""
    echo "Run-on-ssh interactive editor"
    echo "  ENTER accepts defaults shown in [brackets]."
    echo "  Type 'done' (or press ENTER at language prompt) to exit editor."
    echo "  Type 'show' at language prompt to view all languages and their current mappings."
    echo "  Supported language keys:"
    print_supported_language_keys_grid
    echo ""
    all_default=$(prompt_with_default "Initial all-language action route (type 'skip' to keep existing map, 'none' to clear all)" "skip")
    case "$all_default" in
        skip|SKIP)
            ;;
        none|NONE)
            useRunOnSsh=""
            ;;
        *)
            if ! is_valid_runonssh_route "$all_default"; then
                echo "Invalid SSH route '$all_default'. Expected ssh-destination|code-dir|run-script or ssh-address|ssh-user|ssh-port|code-dir|run-script."
            else
                useRunOnSsh=$(runonssh_set_all "$all_default")
            fi
            ;;
    esac

    while :; do
        echo ""
        target_lang=$(prompt_with_default "Language to edit (name/all/show/done; ENTER=done)" "done")
        case "$target_lang" in
            done|DONE)
                break
                ;;
            show|SHOW)
                echo "All run-on-ssh mappings:"
                print_runonssh_all_mappings
                continue
                ;;
            all|ALL)
                action=$(prompt_with_default "Action for all languages (set/remove/skip)" "set")
                case "$action" in
                    remove|REMOVE)
                        useRunOnSsh=""
                        ;;
                    set|SET)
                        all_route=$(prompt_with_default "SSH route for all languages" "127.0.0.1|coderun|2222|/home/coderun/codefiles|../run.sh")
                        if [ -n "$all_route" ]; then
                            if ! is_valid_runonssh_route "$all_route"; then
                                echo "Invalid SSH route '$all_route'. Expected ssh-destination|code-dir|run-script or ssh-address|ssh-user|ssh-port|code-dir|run-script."
                            else
                                useRunOnSsh=$(runonssh_set_all "$all_route")
                            fi
                        fi
                        ;;
                    *) ;;
                esac
                ;;
            *)
                if ! is_known_runondocker_language "$target_lang"; then
                    echo "Unknown language '$target_lang'. Use 'show' to view available keys."
                    continue
                fi
                current_route=$(runonssh_get_route_for_lang "$useRunOnSsh" "$target_lang")
                if [ -z "$current_route" ]; then
                    current_route="127.0.0.1|coderun|2222|/home/coderun/codefiles|../run.sh"
                fi
                action=$(prompt_with_default "Action for $target_lang (set/remove/skip)" "set")
                case "$action" in
                    remove|REMOVE)
                        useRunOnSsh=$(runonssh_remove_lang "$useRunOnSsh" "$target_lang")
                        ;;
                    set|SET)
                        route_value=$(prompt_with_default "SSH route for $target_lang" "$current_route")
                        if [ -n "$route_value" ]; then
                            if ! is_valid_runonssh_route "$route_value"; then
                                echo "Invalid SSH route '$route_value'. Expected ssh-destination|code-dir|run-script or ssh-address|ssh-user|ssh-port|code-dir|run-script."
                            else
                                useRunOnSsh=$(runonssh_set_lang "$useRunOnSsh" "$target_lang" "$route_value")
                            fi
                        fi
                        ;;
                    *) ;;
                esac
                ;;
        esac
    done
}

# Ensure only one init.sh process mutates settings at a time.
acquire_init_lock() {
    lock_root="${TMPDIR:-/tmp}"
    lock_suffix="${UID:-$(id -u 2>/dev/null || echo unknown)}"
    lock_candidate="${lock_root%/}/derekalgos-init.${lock_suffix}.lock"
    if mkdir "$lock_candidate" 2>/dev/null; then
        lockDir="$lock_candidate"
        return 0
    fi

    echo "Another init.sh process appears to be running (lock: $lock_candidate)." >&2
    echo "If this is stale, remove it manually and retry." >&2
    return 1
}

# Clean lock and temp state on normal exit and interruptions.
cleanup_init_state() {
    if [ -n "$profileTmpFile" ] && [ -f "$profileTmpFile" ]; then
        rm -f "$profileTmpFile"
    fi
    if [ -n "$lockDir" ] && [ -d "$lockDir" ]; then
        rmdir "$lockDir" 2>/dev/null
    fi
}

# Apply one --use-* override argument and return non-zero if unrecognized.
apply_use_override_arg() {
    use_arg="$1"
    case "$use_arg" in
    --use-timeout=*)
        useTimeout="${use_arg#*=}"
        ;;
    --use-eiffel=*)
        useEiffel="${use_arg#*=}"
        ;;
    --use-gcc13=*)
        useGcc13="${use_arg#*=}"
        ;;
    --use-gcc13name=*)
        useGcc13Name="${use_arg#*=}"
        ;;
    --use-gxx13name=*)
        useGxx13Name="${use_arg#*=}"
        ;;
    --use-runondocker=*)
        useRunOnDocker="${use_arg#*=}"
        append_runondocker_cli_op "replace" "${use_arg#*=}"
        runOnDockerCliModify=1
        ;;
    --use-runonssh=*)
        useRunOnSsh="${use_arg#*=}"
        append_runonssh_cli_op "replace" "${use_arg#*=}"
        runOnSshCliModify=1
        ;;
    *)
        return 1
        ;;
    esac
    return 0
}

# Apply one supported target flag used by --set-use-only mode.
apply_set_use_only_target_arg() {
    target_arg="$1"
    case "$target_arg" in
    --use-timeout=*|--use-eiffel=*|--use-gcc13=*|--use-gcc13name=*|--use-gxx13name=*|--use-runondocker=*|--use-runonssh=*)
        apply_use_override_arg "$target_arg" || return 1
        updateEnvironment=1
        doPrompt=0
        ;;
    --runondocker)
        runOnDockerMode=1
        updateEnvironment=1
        copyIcons=0
        ;;
    --runondocker-set=*)
        append_runondocker_cli_op "set" "${target_arg#*=}"
        runOnDockerCliModify=1
        updateEnvironment=1
        doPrompt=0
        ;;
    --runondocker-remove=*)
        append_runondocker_cli_op "remove" "${target_arg#*=}"
        runOnDockerCliModify=1
        updateEnvironment=1
        doPrompt=0
        ;;
    --runonssh)
        runOnSshMode=1
        updateEnvironment=1
        copyIcons=0
        ;;
    --runonssh-set=*)
        append_runonssh_cli_op "set" "${target_arg#*=}"
        runOnSshCliModify=1
        updateEnvironment=1
        doPrompt=0
        ;;
    --runonssh-remove=*)
        append_runonssh_cli_op "remove" "${target_arg#*=}"
        runOnSshCliModify=1
        updateEnvironment=1
        doPrompt=0
        ;;
    *)
        return 1
        ;;
    esac
    return 0
}

# Interactive selector for setting exactly one --use-* value.
set_use_only_interactive_prompt() {
    echo ""
    echo "Set-Use-Only interactive mode"
    use_choice=$(prompt_with_default "Choose one use flag to set (timeout/eiffel/gcc13/gcc13name/gxx13name/runondocker/runonssh)" "timeout")
    case "$use_choice" in
        timeout|TIMEOUT)
            useTimeout=$(prompt_with_default "Enter DEREKALGOS_TIMEOUT" "$useTimeout")
            setUseOnlyTarget="--use-timeout=$useTimeout"
            ;;
        eiffel|EIFFEL)
            useEiffel=$(prompt_with_default "Enter DEREKALGOS_EIFFEL (eiffelstudio/libertyeiffel)" "$useEiffel")
            setUseOnlyTarget="--use-eiffel=$useEiffel"
            ;;
        gcc13|GCC13)
            useGcc13=$(prompt_with_default "Enter DEREKALGOS_GCC13" "$useGcc13")
            setUseOnlyTarget="--use-gcc13=$useGcc13"
            ;;
        gcc13name|GCC13NAME)
            useGcc13Name=$(prompt_with_default "Enter DEREKALGOS_GCC13NAME" "$useGcc13Name")
            setUseOnlyTarget="--use-gcc13name=$useGcc13Name"
            ;;
        gxx13name|GXX13NAME)
            useGxx13Name=$(prompt_with_default "Enter DEREKALGOS_GXX13NAME" "$useGxx13Name")
            setUseOnlyTarget="--use-gxx13name=$useGxx13Name"
            ;;
        runondocker|RUNONDOCKER)
            useRunOnDocker=$(prompt_with_default "Enter DEREKALGOS_RUNONDOCKER" "$useRunOnDocker")
            append_runondocker_cli_op "replace" "$useRunOnDocker"
            runOnDockerCliModify=1
            setUseOnlyTarget="--use-runondocker=$useRunOnDocker"
            ;;
        runonssh|RUNONSSH)
            useRunOnSsh=$(prompt_with_default "Enter DEREKALGOS_RUNONSSH" "$useRunOnSsh")
            append_runonssh_cli_op "replace" "$useRunOnSsh"
            runOnSshCliModify=1
            setUseOnlyTarget="--use-runonssh=$useRunOnSsh"
            ;;
        *)
            echo "Unknown set-use-only choice '$use_choice'." >&2
            exit 64
            ;;
    esac

    updateEnvironment=1
    copyIcons=0
}

on_exit() {
    exit_code="$1"
    cleanup_init_state
    print_exit_diagnostic "$exit_code"
}

trap 'on_exit "$?"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

# Startup first makes sure we are running from the repository root. If the
# script was launched elsewhere and the repo is missing, it bootstraps it.
scriptDir=$(CDPATH= cd -- "$(dirname "$0")" 2>/dev/null && pwd -P)
if [ -n "$scriptDir" ] && [ -f "$scriptDir/run.sh" ] && [ -d "$scriptDir/icons" ]; then
    cd "$scriptDir" || exit "$exitSetupFailure"
elif [ ! -f "./run.sh" ] || [ ! -d "./icons" ]; then
    git clone https://github.com/derekshoneycutt/algorithms.git
    cd algorithms || exit "$exitSetupFailure"
fi

# Parse command line arguments for non-interactive and override modes.
for arg in "$@"; do
    if [ "$setUseOnlyWaiting" -eq 1 ]; then
        if apply_set_use_only_target_arg "$arg"; then
            setUseOnlyTarget="$arg"
            setUseOnlyWaiting=0
        else
            echo "--set-use-only expects the next flag to be --use-* or --runondocker/--runonssh with optional set/remove." >&2
            exit 64
        fi
        continue
    fi

    if [ "$setUseOnly" -eq 1 ]; then
        continue
    fi

    case "$arg" in
    --interactive)
        interactiveFlagCount=$((interactiveFlagCount + 1))
        if [ "$interactiveFlagCount" -gt 1 ]; then
            echo "--interactive may be specified at most once." >&2
            exit 64
        fi
        doPrompt=1
        promptForcedOff=0
        ;;
    --no-prompt)
        noPromptFlagCount=$((noPromptFlagCount + 1))
        if [ "$noPromptFlagCount" -gt 1 ]; then
            echo "--no-prompt may be specified at most once." >&2
            exit 64
        fi
        doPrompt=0
        promptForcedOff=1
        ;;
    --set-use-only)
        setUseOnly=1
        setUseOnlyWaiting=1
        if [ "$promptForcedOff" -eq 0 ]; then
            doPrompt=1
        fi
        copyIcons=0
        updateEnvironment=0
        ;;
    --copy-icons)
        copyIcons=1
        ;;
    --no-icons)
        copyIcons=0
        ;;
    --icons-to=*)
        copyIconsTo="${arg#*=}"
        ;;
    --update-environment)
        updateEnvironment=1
        ;;
    --skip-environment)
        updateEnvironment=0
        ;;
    --update-profile=*)
        updateProfileOverridePath="${arg#*=}"
        if [ -z "$updateProfileOverridePath" ]; then
            echo "--update-profile requires a non-empty file path." >&2
            exit 64
        fi
        ;;
    --check-only)
        checkOnly=1
        doPrompt=0
        ;;
    --runondocker-only|--runonssh-only)
        echo "$arg is no longer supported. Use --runondocker or --runonssh." >&2
        exit 64
        ;;
    --runondocker)
        runOnDockerMode=1
        updateEnvironment=1
        copyIcons=0
        ;;
    --runonssh)
        runOnSshMode=1
        updateEnvironment=1
        copyIcons=0
        ;;
    --runondocker-set=*)
        append_runondocker_cli_op "set" "${arg#*=}"
        runOnDockerCliModify=1
        updateEnvironment=1
        ;;
    --runonssh-set=*)
        append_runonssh_cli_op "set" "${arg#*=}"
        runOnSshCliModify=1
        updateEnvironment=1
        ;;
    --runondocker-remove=*)
        append_runondocker_cli_op "remove" "${arg#*=}"
        runOnDockerCliModify=1
        updateEnvironment=1
        ;;
    --runonssh-remove=*)
        append_runonssh_cli_op "remove" "${arg#*=}"
        runOnSshCliModify=1
        updateEnvironment=1
        ;;
    --help|-h)
        print_usage_short
        exit "$exitOk"
        ;;
    --help-all)
        print_usage_full
        exit "$exitOk"
        ;;
    --help=*)
        helpTopic="${arg#*=}"
        if ! print_usage_topic "$helpTopic"; then
            exit 64
        fi
        exit "$exitOk"
        ;;
    --use-timeout=*|--use-eiffel=*|--use-gcc13=*|--use-gcc13name=*|--use-gxx13name=*|--use-runondocker=*|--use-runonssh=*)
        apply_use_override_arg "$arg"
        ;;
    *)
        echo "Unknown argument: $arg" >&2
        if [ "${arg#--}" != "$arg" ]; then
            optionSuggestion=$(suggest_option_for_unknown "$arg")
            if [ -n "$optionSuggestion" ]; then
                echo "Did you mean: $optionSuggestion" >&2
            fi
        fi
        exit 64
        ;;
    esac
done

if [ "$setUseOnlyWaiting" -eq 1 ]; then
    if [ "$doPrompt" -eq 1 ]; then
        setUseOnlyInteractivePending=1
        setUseOnlyWaiting=0
    else
        echo "--set-use-only requires one following --use-* or --runondocker/--runonssh target flag." >&2
        exit 64
    fi
fi

if ! acquire_init_lock; then
    echo "Warning: continuing without lock after lock acquisition failure." >&2
fi

# Profile loading is deferred until it is actually needed so icon-only runs do
# not touch shell configuration logic at all.
needProfile=0
if [ "$updateEnvironment" -eq 1 ] || [ "$runOnDockerMode" -eq 1 ] || [ "$runOnDockerCliModify" -eq 1 ] || [ "$runOnSshMode" -eq 1 ] || [ "$runOnSshCliModify" -eq 1 ]; then
    needProfile=1
fi

useProfile=""
if [ "$needProfile" -eq 1 ]; then
    if [ -n "$updateProfileOverridePath" ]; then
        useProfile=$(expand_home_path "$updateProfileOverridePath")
    else
        useProfile=$(determine_profile_for_platform)
        if [ -z "$useProfile" ]; then
            echo "Unsupported platform '$currentPlatform'; unable to choose profile file." >&2
            exit "$exitUnsupportedPlatform"
        fi
    fi
    load_existing_defaults_from_profile "$useProfile"
fi

if [ "$setUseOnlyInteractivePending" -eq 1 ]; then
    set_use_only_interactive_prompt
fi

if [ "$runOnDockerCliModify" -eq 1 ]; then
    apply_runondocker_cli_changes
fi

if [ "$runOnSshCliModify" -eq 1 ]; then
    apply_runonssh_cli_changes
fi

if [ "$runOnDockerMode" -eq 1 ]; then
    if [ "$doPrompt" -eq 1 ]; then
        edit_runondocker_interactive
    else
        show_runondocker_map
        if [ "$runOnDockerCliModify" -eq 0 ]; then
            updateEnvironment=0
        fi
    fi
fi

if [ "$runOnSshMode" -eq 1 ]; then
    if [ "$doPrompt" -eq 1 ]; then
        edit_runonssh_interactive
    else
        show_runonssh_map
        if [ "$runOnSshCliModify" -eq 0 ]; then
            updateEnvironment=0
        fi
    fi
fi

# Potentially prompt if we should copy the icons
if [ "$doPrompt" -eq 1 ] && [ "$setUseOnly" -eq 0 ]; then
    YN_PROMPT="[Y/n]"
    if [ "$copyIcons" -eq 0 ]; then
        YN_PROMPT="[y/N]"
    fi
    printf "Do you wish to copy icons to VSCode local folder? %s " "$YN_PROMPT"
    yn=$(read_user_input)
    case "$yn" in
        [Yy]* ) copyIcons=1 ;;
        [Nn]* ) copyIcons=0 ;;
        * ) ;;
    esac
    echo ""
fi

# Optionally copy icon assets to the VS Code icon directory.
if [ "$copyIcons" -eq 1 ]; then
    copyIconsTo=$(expand_home_path "$copyIconsTo")
    if [ "$checkOnly" -eq 1 ]; then
        echo "CHECK: would copy icons to $copyIconsTo"
    else
        if [ "$doPrompt" -eq 1 ]; then
            copyIconsTo=$(prompt_with_default "Enter folder to copy icons to" "$copyIconsTo")
            copyIconsTo=$(expand_home_path "$copyIconsTo")
        fi
        mkdir -p "$copyIconsTo"
        cp -fv ./icons/*.svg "$copyIconsTo"
    fi
    echo ""
fi

# Potentially prompt if we should update the environment variables
if [ "$doPrompt" -eq 1 ] && [ "$setUseOnly" -eq 0 ]; then
    YN_PROMPT="[Y/n]"
    if [ "$updateEnvironment" -eq 0 ]; then
        YN_PROMPT="[y/N]"
    fi
    printf "Do you wish to update the environment? %s " "$YN_PROMPT"
    yn=$(read_user_input)
    case "$yn" in
        [Yy]* ) updateEnvironment=1 ;;
        [Nn]* ) updateEnvironment=0 ;;
        * ) ;;
    esac
    echo ""
fi

# Environment updates follow one pipeline: gather final values from profile,
# CLI, and optional prompts, then rewrite the managed export block atomically.
# Rewrite profile-managed DEREKALGOS exports in a marked block.
if [ "$updateEnvironment" -eq 1 ]; then
    # Start prompting for any important
    if [ "$doPrompt" -eq 1 ]; then
        if [ "$runOnDockerMode" -eq 0 ] && [ "$runOnSshMode" -eq 0 ]; then
            useTimeout=$(prompt_with_default "Enter a timeout" "$useTimeout")
            echo ""
            useEiffel=$(prompt_with_default "Enter Eiffel compiler (eiffelstudio/libertyeiffel; case-insensitive)" "$useEiffel")
            echo ""
            useGcc13=$(prompt_with_default "Enter the GCC 13 path" "$useGcc13")
            echo ""
            useGcc13Name=$(prompt_with_default "Enter the GCC 13 executable name" "$useGcc13Name")
            echo ""
            useGxx13Name=$(prompt_with_default "Enter the G++ 13 executable name" "$useGxx13Name")
            echo ""
        fi

        if [ "$setUseOnly" -eq 0 ] && [ "$runOnDockerMode" -eq 0 ] && [ "$runOnDockerCliModify" -eq 0 ]; then
            YN_PROMPT="[y/N]"
            printf "Edit DEREKALGOS_RUNONDOCKER interactively? %s " "$YN_PROMPT"
            yn=$(read_user_input)
            case "$yn" in
                [Yy]* ) edit_runondocker_interactive ;;
                * )
                    echo ""
                    useRunOnDocker=$(prompt_with_default "Enter the string of languages to run on docker" "$useRunOnDocker")
                    ;;
            esac
            echo ""
        fi

        if [ "$setUseOnly" -eq 0 ] && [ "$runOnSshMode" -eq 0 ] && [ "$runOnSshCliModify" -eq 0 ]; then
            YN_PROMPT="[y/N]"
            printf "Edit DEREKALGOS_RUNONSSH interactively? %s " "$YN_PROMPT"
            yn=$(read_user_input)
            case "$yn" in
                [Yy]* ) edit_runonssh_interactive ;;
                * )
                    echo ""
                    useRunOnSsh=$(prompt_with_default "Enter SSH routes as lang=ssh-destination|code-dir|run-script or lang=ssh-address|ssh-user|ssh-port|code-dir|run-script" "$useRunOnSsh")
                    ;;
            esac
            echo ""
        fi
    fi

    escaped_timeout=$(escape_profile_value "$useTimeout")
    escaped_eiffel=$(escape_profile_value "$useEiffel")
    escaped_gcc13=$(escape_profile_value "$useGcc13")
    escaped_gcc13name=$(escape_profile_value "$useGcc13Name")
    escaped_gxx13name=$(escape_profile_value "$useGxx13Name")
    escaped_runondocker=$(escape_profile_value "$useRunOnDocker")
    escaped_runonssh=$(escape_profile_value "$useRunOnSsh")

    if [ "$checkOnly" -eq 1 ]; then
        echo "CHECK: would update profile $useProfile"
    else
        profile_dir=$(dirname "$useProfile")
        if [ ! -d "$profile_dir" ]; then
            mkdir -p "$profile_dir" || {
                echo "Unable to create profile directory: $profile_dir" >&2
                exit "$exitIoFailure"
            }
        fi

        profile_tmp=$(make_temp_file_secure "profile" "$profile_dir")
        if [ -z "$profile_tmp" ]; then
            echo "Unable to create temporary file for profile update." >&2
            exit "$exitIoFailure"
        fi
        profileTmpFile="$profile_tmp"

        # This is a standard rewrite-via-temp-file flow: strip the old managed
        # block, append the new managed block, then replace the profile in one move.
        if [ -f "$useProfile" ]; then
            sed \
                -e '/^# >>> DEREKALGOS INIT >>>$/d' \
                -e '/^# <<< DEREKALGOS INIT <<<$/d' \
                -e '/^export DEREKALGOS_TIMEOUT=/d' \
                -e '/^export DEREKALGOS_EIFFEL=/d' \
                -e '/^export DEREKALGOS_GCC13=/d' \
                -e '/^export DEREKALGOS_GCC13NAME=/d' \
                -e '/^export DEREKALGOS_GXX13NAME=/d' \
                -e '/^export DEREKALGOS_RUNONDOCKER=/d' \
                -e '/^export DEREKALGOS_RUNONSSH=/d' \
                "$useProfile" > "$profile_tmp"
        else
            : > "$profile_tmp"
        fi

        {
            echo ""
            echo "# >>> DEREKALGOS INIT >>>"
            echo "export DEREKALGOS_TIMEOUT=\"$escaped_timeout\""
            echo "export DEREKALGOS_EIFFEL=\"$escaped_eiffel\""
            echo "export DEREKALGOS_GCC13=\"$escaped_gcc13\""
            echo "export DEREKALGOS_GCC13NAME=\"$escaped_gcc13name\""
            echo "export DEREKALGOS_GXX13NAME=\"$escaped_gxx13name\""
            echo "export DEREKALGOS_RUNONDOCKER=\"$escaped_runondocker\""
            echo "export DEREKALGOS_RUNONSSH=\"$escaped_runonssh\""
            echo "# <<< DEREKALGOS INIT <<<"
        } >> "$profile_tmp"

        mv "$profile_tmp" "$useProfile"
        profileTmpFile=""
    fi

fi

echo ""
echo "==== INIT SUMMARY ===="
echo "platform: $currentPlatform"
echo "check-only: $checkOnly"
echo "copy-icons: $copyIcons"
echo "update-environment: $updateEnvironment"
echo "timeout: $useTimeout"
echo "run-on-docker map size: $(printf '%s\n' "$useRunOnDocker" | wc -w | tr -d ' ')"
if [ "$updateEnvironment" -eq 1 ]; then
    summary_profile="$useProfile"
    if [ -z "$summary_profile" ]; then
        summary_profile=$(determine_profile_for_platform)
    fi
    echo "profile: $summary_profile"
fi
echo "note: run.sh now reads DEREKALGOS_TIMEOUT and propagates it through docker relay."
echo "======================"
