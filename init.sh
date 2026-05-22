#! /bin/sh

# The point of this script is to initiate the system for working with
# several parts. This doesn't do anything with the installing any compilers,
# though the docker is suggested beforehand.

# At this time, the environment variables for SSH have to be added manually,
# but this will provide a really good start.

currentPlatform=$(uname -s)
scriptDir=$(CDPATH= cd -- "$(dirname "$0")" && pwd -P)
. "$scriptDir/shlib/loader.sh" || {
    echo "ERROR: unable to load shlib loader from $scriptDir/shlib/loader.sh" >&2
    exit 78
}
load_required_shlib_modules "init.sh" "$scriptDir" \
    suggest.sh \
    terminal.sh \
    docker-policy.sh \
    profile.sh \
    runonssh-contract.sh \
    check-env.sh \
    help-common.sh \
    help-catalogs.sh \
    init-runon-map.sh || exit 78
generatedLanguagesScript="$scriptDir/shlib/generated/languages.generated.sh"
[ -f "$generatedLanguagesScript" ] || {
    echo "ERROR: missing generated language catalog: $generatedLanguagesScript" >&2
    exit 78
}
. "$generatedLanguagesScript" || {
    echo "ERROR: unable to source generated language catalog: $generatedLanguagesScript" >&2
    exit 78
}
doPrompt=1
copyIcons=1
copyIconsTo=~/.vscode/extensions/icons/
updateEnvironment=1
updateProfileOverridePath=
buildDocker=0
buildVscodeExtension=0
checkOnly=0
checkEnv=0
useTimeout="-k 10s 2m"
useEiffel="eiffelstudio"
useGcc13="/usr/bin/"
useGcc13Name="gcc-13"
useGxx13Name="g++-13"
useRunOnDocker="ada=code-runner asm=code-runner ballerina=code-runner freebasic=code-runner c=code-runner clojure=code-runner cobol=code-runner cpp=code-runner csharp=code-runner d=code-runner dart=code-runner eiffel=code-runner erlang=code-runner elixir=code-runner fortran=code-runner factor=code-runner fsharp=code-runner forth=code-runner gleam=code-runner go=code-runner haskell=code-runner haxe=code-runner icon=code-runner idris=code-runner java=code-runner julia=code-runner javascript=code-runner kit=code-runner kotlin=code-runner llvmir=code-runner lua=code-runner objectivec=code-runner modula3=code-runner octave=code-runner ocaml=code-runner mmixal=code-runner oberon=code-runner mojo=code-runner mercury=code-runner nasm=code-runner nim=code-runner pascal=code-runner php=code-runner prolog=code-runner perl=code-runner python=code-runner r=code-runner ruby=code-runner racket=code-runner rust=code-runner scala=code-runner scheme=code-runner simula=code-runner smalltalk=code-runner swift=code-runner tcl=code-runner typescript=code-runner v=code-runner visualbasic=code-runner wat=code-runner zig=code-runner"
useRunOnSsh=""
supportedLanguageKeys=$(get_generated_supported_language_keys | tr '\n' ' ' | sed 's/[[:space:]]*$//')
managedProfileBlockStart="$GENERATED_PROFILE_BLOCK_START"
managedProfileBlockEnd="$GENERATED_PROFILE_BLOCK_END"
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

# =============================================
# Help And Usage
# =============================================

# Print compact examples first so most users can scan quickly.
print_usage_examples() {
    echo "Examples:"
    echo "  $0"
    echo "  $0 --no-prompt --check-only"
    echo "  $0 --set-use-only --use-eiffel=libertyeiffel"
    echo "  $0 --check-env"
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
    echo "  --build-docker         Build Dockerfile as linux/amd64 (default: off)"
    echo "  --build-vscode-extension Build VS Code extension VSIX package (default: off)"
    echo "  --check-only           Dry-run mode; do not write files [default: off]"
    echo "  --check-env            Read-only environment diagnostics and map validation"
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

# Print Docker support policy and platform scope.
print_usage_docker_section() {
    echo "Docker support policy:"
    echo "  init.sh can configure Docker runner mappings (DEREKALGOS_RUNONDOCKER), and"
    echo "  run.sh can execute through those Docker relay images."
    echo ""
    print_usage_docker_policy_common
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
    echo "  --help=<topic>         Show one topic (examples, prompt, set-use-only, env, docker, runondocker, runonssh)"
    echo "  --interactive          Keep interactive prompts enabled"
    echo "  --no-prompt            Disable prompts"
    echo "  --check-only           Dry-run mode; do not write files"
    echo "  --check-env            Run read-only environment diagnostics and exit"
    echo "  --update-profile=<f>   Override which profile file gets updated"
    echo "  --build-docker         Build Dockerfile as linux/amd64"
    echo "  --build-vscode-extension Build VS Code extension VSIX package"
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
    echo "  --help=<topic>         Show one topic (examples, prompt, set-use-only, env, docker, runondocker, runonssh)"
    echo ""
    print_usage_examples
    print_usage_prompt_section
    print_usage_set_use_only_section
    print_usage_env_section
    print_usage_docker_section
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
        docker) print_usage_docker_section ;;
        runondocker) print_usage_runondocker_section ;;
        runonssh) print_usage_runonssh_section ;;
        *)
            echo "Unknown help topic: $1" >&2
            topicSuggestion=$(suggest_help_topic_for_unknown "$1")
            if [ -n "$topicSuggestion" ]; then
                echo "Did you mean: $topicSuggestion" >&2
            fi
            echo "Supported topics: examples, prompt, set-use-only, env, docker, runondocker, runonssh" >&2
            return 1
            ;;
    esac
}

# Backward-compatible default help entry point.
print_usage() {
    print_usage_short
}

# =============================================
# Did-You-Mean Suggestion Helpers
# =============================================

# Print supported option keys for did-you-mean matching.
print_option_catalog() {
    print_option_catalog_for_script init
}

# Print supported help topics for did-you-mean matching.
print_help_topic_catalog() {
    print_help_topic_catalog_for_script init
}

# Suggest the closest language target key for run-on map edits.
suggest_language_key_for_unknown() {
    unknownKey="$1"
    languageCatalog=""
    for langKey in $supportedLanguageKeys all; do
        if [ -n "$languageCatalog" ]; then
            languageCatalog="$languageCatalog
$langKey"
        else
            languageCatalog="$langKey"
        fi
    done
    suggest_from_catalog "$unknownKey" "$languageCatalog" | head -n 1
}

# =============================================
# Exit Codes And Diagnostics
# =============================================

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

# =============================================
# I/O And Prompt Helpers
# =============================================

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

# =============================================
# Profile Helpers
# =============================================

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

# Return escaped managed export value by export name.
get_managed_export_escaped_value() {
    exportName="$1"

    case "$exportName" in
        DEREKALGOS_TIMEOUT)
            printf '%s' "$escaped_timeout"
            ;;
        DEREKALGOS_EIFFEL)
            printf '%s' "$escaped_eiffel"
            ;;
        DEREKALGOS_GCC13)
            printf '%s' "$escaped_gcc13"
            ;;
        DEREKALGOS_GCC13NAME)
            printf '%s' "$escaped_gcc13name"
            ;;
        DEREKALGOS_GXX13NAME)
            printf '%s' "$escaped_gxx13name"
            ;;
        DEREKALGOS_RUNONDOCKER)
            printf '%s' "$escaped_runondocker"
            ;;
        DEREKALGOS_RUNONSSH)
            printf '%s' "$escaped_runonssh"
            ;;
        *)
            printf '%s' ""
            ;;
    esac
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

# =============================================
# Run-On Map Subsystem
# =============================================

# Run-on map helpers, editors, and CLI mutation logic are sourced from
# shlib/init-runon-map.sh via the loader contract near the top of this file.

# =============================================
# Lock And Cleanup
# =============================================

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

# =============================================
# CLI Argument Helpers
# =============================================

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
            if [ "${arg#--}" != "$arg" ]; then
                optionSuggestion=$(suggest_option_for_unknown "$arg")
                if [ -n "$optionSuggestion" ]; then
                    echo "Did you mean: $optionSuggestion" >&2
                fi
            fi
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
    --build-docker)
        buildDocker=1
        ;;
    --build-vscode-extension)
        buildVscodeExtension=1
        ;;
    --check-only)
        checkOnly=1
        doPrompt=0
        ;;
    --check-env)
        checkEnv=1
        doPrompt=0
        copyIcons=0
        updateEnvironment=0
        buildDocker=0
        buildVscodeExtension=0
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

if [ "$checkOnly" -ne 1 ]; then
    if ! acquire_init_lock; then
        echo "Warning: continuing without lock after lock acquisition failure." >&2
    fi
fi

# Profile loading is deferred until it is actually needed so icon-only runs do
# not touch shell configuration logic at all.
needProfile=0
if [ "$updateEnvironment" -eq 1 ] || [ "$runOnDockerMode" -eq 1 ] || [ "$runOnDockerCliModify" -eq 1 ] || [ "$runOnSshMode" -eq 1 ] || [ "$runOnSshCliModify" -eq 1 ] || [ "$checkEnv" -eq 1 ]; then
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

if [ "$checkEnv" -eq 1 ]; then
    if run_init_check_env; then
        exit "$exitOk"
    fi
    exit 1
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
            sed_script_file=$(make_temp_file_secure "profile-sed" "$profile_dir")
            if [ -z "$sed_script_file" ]; then
                echo "Unable to create temporary sed script for profile rewrite." >&2
                exit "$exitIoFailure"
            fi

            {
                printf '/^%s$/d\n' "$managedProfileBlockStart"
                printf '/^%s$/d\n' "$managedProfileBlockEnd"

                get_generated_managed_profile_exports | while IFS= read -r export_name; do
                    [ -n "$export_name" ] || continue
                    printf '/^export %s=/d\n' "$export_name"
                done
            } > "$sed_script_file"

            if ! sed -f "$sed_script_file" "$useProfile" > "$profile_tmp"; then
                rm -f "$sed_script_file"
                echo "Unable to rewrite existing profile content from: $useProfile" >&2
                exit "$exitIoFailure"
            fi
            rm -f "$sed_script_file"
        else
            : > "$profile_tmp"
        fi

        {
            echo ""
            echo "$managedProfileBlockStart"
            get_generated_managed_profile_exports | while IFS= read -r export_name; do
                [ -n "$export_name" ] || continue
                escaped_value=$(get_managed_export_escaped_value "$export_name")
                echo "export ${export_name}=\"$escaped_value\""
            done
            echo "$managedProfileBlockEnd"
        } >> "$profile_tmp"

        if ! mv "$profile_tmp" "$useProfile"; then
            echo "Unable to replace profile file: $useProfile" >&2
            exit "$exitIoFailure"
        fi
        profileTmpFile=""
    fi

fi

# Optionally build local docker image used by run.sh docker-relay paths.
if [ "$doPrompt" -eq 1 ]; then
    YN_PROMPT="[y/N]"
    if [ "$buildDocker" -eq 1 ]; then
        YN_PROMPT="[Y/n]"
    fi
    printf "Do you wish to build Dockerfile for linux/amd64 now? %s " "$YN_PROMPT"
    yn=$(read_user_input)
    case "$yn" in
        [Yy]* ) buildDocker=1 ;;
        [Nn]* ) buildDocker=0 ;;
        * ) ;;
    esac
    echo ""

    YN_PROMPT="[y/N]"
    if [ "$buildVscodeExtension" -eq 1 ]; then
        YN_PROMPT="[Y/n]"
    fi
    printf "Do you wish to build VS Code extension package now? %s " "$YN_PROMPT"
    yn=$(read_user_input)
    case "$yn" in
        [Yy]* ) buildVscodeExtension=1 ;;
        [Nn]* ) buildVscodeExtension=0 ;;
        * ) ;;
    esac
    echo ""
fi

if [ "$buildDocker" -eq 1 ]; then
    if [ "$checkOnly" -eq 1 ]; then
        echo "CHECK: would build docker image 'code-runner' from ./Dockerfile for linux/amd64"
    else
        if ! command -v docker > /dev/null 2>&1; then
            echo "docker command not found; unable to build Dockerfile." >&2
            exit "$exitSetupFailure"
        fi
        if [ ! -f "./Dockerfile" ]; then
            echo "Dockerfile not found at ./Dockerfile" >&2
            exit "$exitSetupFailure"
        fi

        echo "Building docker image 'code-runner' for linux/amd64..."
        docker build --platform linux/amd64 -t code-runner -f ./Dockerfile .
        dockerRet="$?"
        if [ "$dockerRet" -ne 0 ]; then
            echo "docker build failed with exit code $dockerRet" >&2
            exit "$dockerRet"
        fi
    fi
fi

if [ "$buildVscodeExtension" -eq 1 ]; then
    if [ "$checkOnly" -eq 1 ]; then
        echo "CHECK: would install npm dependencies and build VS Code extension VSIX package"
    else
        if ! command -v npm > /dev/null 2>&1; then
            echo "npm command not found; unable to build VS Code extension." >&2
            exit "$exitSetupFailure"
        fi

        echo "Installing npm dependencies..."
        npm install
        npmInstallRet="$?"
        if [ "$npmInstallRet" -ne 0 ]; then
            echo "npm install failed with exit code $npmInstallRet" >&2
            exit "$npmInstallRet"
        fi

        echo "Building VS Code extension package..."
        npm run buildextension
        npmRet="$?"
        if [ "$npmRet" -ne 0 ]; then
            echo "npm run buildextension failed with exit code $npmRet" >&2
            exit "$npmRet"
        fi
    fi
fi

echo ""
echo "==== INIT SUMMARY ===="
echo "platform: $currentPlatform"
echo "check-only: $checkOnly"
echo "build-docker: $buildDocker"
echo "build-vscode-extension: $buildVscodeExtension"
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
