#! /bin/sh

# Color variables
red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
blue='\033[0;34m'
normal='\033[0m' # Resets the color to default

scriptDir=$(CDPATH= cd -- "$(dirname "$0")" && pwd -P)
. "$scriptDir/shlib/loader.sh" || {
  echo "ERROR: unable to load shlib loader from $scriptDir/shlib/loader.sh" >&2
  exit 78
}
load_required_shlib_modules "run.sh" "$scriptDir" \
  suggest.sh \
  terminal.sh \
  docker-policy.sh \
  profile.sh \
  runonssh-contract.sh \
  help-common.sh \
  help-catalogs.sh \
  run-relay.sh \
  run-language-loader.sh || exit 78
load_run_language_modules "$scriptDir" || exit 78

# =============================================
# Help And Usage
# =============================================

# Print compact examples first so most users can scan quickly.
print_usage_examples() {
  echo "Examples:"
  echo "  $0 main.py"
  echo "  $0 python"
  echo "  $0 --smoke-test"
  echo "  $0 --smoke-test --langs=\"cpp rust\""
  echo "  $0 --list-languages"
  echo "  $0 --list-problems"
  echo "  $0 --flag=python"
  echo "  $0 --flag=all"
  echo "  $0 --unflag=none"
  echo "  $0 --unflag=python"
  echo "  $0 --check-only main.py"
  echo "  $0 --check-only=docker main.py"
  echo "  $0 --compile-only main.py arg1 arg2"
  echo "  $0 --source-profile=~/.bash_profile main.py"
  echo "  $0 clean"
  echo "  $0 clean --defaults"
  echo "  $0 clean --defaults=y|n"
  echo ""
}

# Print profile-sourcing options and logging behavior.
print_usage_profile_section() {
  echo "Profile sourcing:"
  echo "  --source-profile=<profile-path>   Source this profile before running"
  echo "  --source-profile=                 Disable profile sourcing"
  echo "  Otherwise, the default profile for the platform is sourced."
  echo "  If the sourced file does not exist or contains an error, the script continues."
  echo "  Profile source output is logged to $HOME/.cache/derekalgos/profile.log."
  echo "  If unavailable, logging falls back to ${TMPDIR:-/tmp}/derekalgos-profile.log."
  echo ""
}

# Print check-only and compile-only controls.
print_usage_execution_section() {
  echo "Execution controls:"
  echo "  --smoke-test [smoke-opts...]    Run smoke tests for the current algorithm directory and exit"
  echo "                                   Forwarded smoke opts: --langs=..., --timeout=..., --slow-timeout=..., --markdown[=<path>]"
  echo "  --check-only[=native|docker|ssh] Skip compile/run after setup; optionally simulate one route"
  echo "  --compile-only                    Compile only; skip runtime execution"
  echo ""
  echo "Behavior notes:"
  echo "  --check-only skips both compile and run."
  echo "  --check-only=docker or --check-only=ssh simulates that relay path only."
  echo "  --check-only= or --check-only=native uses native simulation."
  echo ""
}

# Print Docker runner support details.
print_usage_docker_section() {
  echo "Docker support:"
  echo "  This project supports running languages via a Docker image as the relay runner."
  echo "  The image to use is configured via the DEREKALGOS_RUNONDOCKER environment variable"
  echo "  (set globally or per-language via init.sh)."
  echo ""
  print_usage_docker_policy_common
}

# Print general invocation and argument forwarding behavior.
print_usage_general_section() {
  echo "General behavior:"
  echo "  This is intended to be run from the command line in the directory of the source file."
  echo "  You may pass a language key (for example: python) instead of a filename."
  echo "  Naming standard for auto-pick: use <algorithm>.<ext> (case-insensitive),"
  echo "  or a shortened suffix of the algorithm name (for example: hello for hello_world)."
  echo "  If first parameter is not a recognized language key, it is treated as filename."
  echo "  Following parameters are passed to the final executable as argv."
  echo "  Supported filename input compiles and runs where possible."
  echo "  Build and run artifacts/logs are written to ./output."
  echo "  clean erases local output, cleans stdlib, and exits."
  echo ""
}

print_usage_clean_section() {
  echo "Clean options:"
  echo "  clean                     Interactive: prompt for stdlib and archive cleanup"
  echo "  clean --defaults          Non-interactive: answer 'yes' to all prompts"
  echo "  clean --defaults=y        Answer 'yes' to both prompts"
  echo "  clean --defaults=n        Answer 'no' to both prompts"
  echo "  clean --defaults=yes      Same as --defaults=y"
  echo "  clean --defaults=no       Same as --defaults=n"
  echo "  clean --defaults=y|n      Per-prompt defaults: stdlib first, archive second"
  echo "                            Also supports yes|no, yes|yes, no|no"
  echo ""
}

# Print compact, first-screen help for common usage.
print_usage_short() {
  echo "Usage: $0 [--smoke-test]"
  echo "       $0 [--list-languages|--list-problems|--flag=<lang>|--unflag=<lang>] [--source-profile=<profile-path>] [--check-only[=native|docker|ssh]] [--compile-only] <filename|lang|clean> [args...]"
  echo "       $0 --help"
  echo ""
  print_usage_examples
  echo "Common options:"
  echo "  --help                 Show this compact help and exit"
  echo "  --help-all             Show full help and exit"
  echo "  --help=<topic>         Show one topic (examples, profile, execution, docker, general, clean)"
  echo "  --smoke-test [opts]    Run smoke tests and exit (supported opts forwarded to smoke script)"
  echo "  --list-languages       Show language presence grid for current directory and exit"
  echo "  --list-problems        Show only missing or flagged languages and exit"
  echo "  --flag=<lang>          Mark <lang> in ./.flag-lang and exit (also: all, none)"
  echo "  --unflag=<lang>        Remove <lang> from ./.flag-lang and exit (also: all, none)"
  echo "  --source-profile=<p>   Source profile before running"
  echo "  --check-only[=route]   Dry-run/setup simulation"
  echo "  --compile-only         Compile but do not run"
  echo ""
  echo "For full details: $0 --help-all"
}

# Print complete help with all sections.
print_usage_full() {
  echo "Usage: $0 [--smoke-test]"
  echo "       $0 [--list-languages|--list-problems|--flag=<lang>|--unflag=<lang>] [--source-profile=<profile-path>] [--check-only[=native|docker|ssh]] [--compile-only] <filename|lang|clean> [args...]"
  echo "       $0 --help"
  echo ""
  echo "Help options:"
  echo "  --help                 Show compact help and exit"
  echo "  --help-all             Show full help and exit"
  echo "  --help=<topic>         Show one topic (examples, profile, execution, docker, general, clean)"
  echo "  --smoke-test [opts]    Run smoke tests and exit (supported opts forwarded to smoke script)"
  echo "  --list-languages       Show language presence grid for current directory and exit"
  echo "  --list-problems        Show only missing or flagged languages and exit"
  echo "  --flag=<lang>          Mark <lang> in ./.flag-lang and exit (also: all, none)"
  echo "  --unflag=<lang>        Remove <lang> from ./.flag-lang and exit (also: all, none)"
  echo ""
  print_usage_examples
  print_usage_profile_section
  print_usage_execution_section
  print_usage_docker_section
  print_usage_general_section
  print_usage_clean_section
  echo "Environment setup tip: run ../../../init.sh from an algorithm directory (or ./init.sh from repo root) to configure most variables automatically."
  echo "You can still override values in your profile via --source-profile=<path>."
}

# Print one focused help section selected by topic.
print_usage_topic() {
  case "$1" in
    examples) print_usage_examples ;;
    profile) print_usage_profile_section ;;
    execution) print_usage_execution_section ;;
    docker) print_usage_docker_section ;;
    general) print_usage_general_section ;;
    clean) print_usage_clean_section ;;
    *)
      echo "Unknown help topic: $1" >&2
      topicSuggestion=$(suggest_help_topic_for_unknown "$1")
      if [ -n "$topicSuggestion" ]; then
        echo "Did you mean: $topicSuggestion" >&2
      fi
      echo "Supported topics: examples, profile, execution, docker, general, clean" >&2
      return 1
      ;;
  esac
}

# Backward-compatible default help entry point.
print_usage() {
  print_usage_short
}

# =============================================
# Language Catalog And Target Resolution
# =============================================

# Print supported option keys for did-you-mean matching.
print_option_catalog() {
  print_option_catalog_for_script run
}

# One source of truth for language catalog:
#   language|extension|test-file-template
get_language_catalog() {
  cat <<'EOF'
ada|adb|./output/$fileNameWithoutExt
arm64asm|s|./output/$fileNameWithoutExt
asm|asm|./output/$fileNameWithoutExt
ballerina|bal|./output/$fileNameWithoutExt.jar
c|c|./output/$fileNameWithoutExt
clojure|clj|./output/target/uberjar/$fileNameWithoutExt-1.0.0-standalone.jar
cobol|cob|./output/$fileNameWithoutExt
cpp|cpp|./output/$fileNameWithoutExt
csharp|cs|./output/bin/Debug/net10.0/$fileNameWithoutExt
d|d|./output/$fileNameWithoutExt
dart|dart|./output/$fileNameWithoutExt
eiffel|e|./output/EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt
elixir|exs|./$fileName
erlang|erl|./output/$fileNameWithoutExt.beam
factor|factor|./$fileName
forth|fth|./$fileName
fortran|f90|./output/$fileNameWithoutExt
freebasic|bas|./output/$fileNameWithoutExt
fsharp|fs|./output/bin/Debug/net10.0/$fileNameWithoutExt
gleam|gleam|./output/build/dev/erlang/$fileNameWithoutExt/ebin/$fileNameWithoutExt.beam
go|go|./output/$fileNameWithoutExt
haskell|hs|./output/$fileNameWithoutExt
haxe|hx|./$fileName
icon|icn|./output/$fileNameWithoutExt
idris|idr|./output/build/exec/$fileNameWithoutExt
java|java|./output/$fileNameWithoutExt.jar
javascript|js|./output/$fileName
julia|jl|./$fileName
kit|kit|./$fileName
kotlin|kt|./output/$fileNameWithoutExt.jar
llvmir|ll|./output/$fileNameWithoutExt
lua|lua|./output/$fileNameWithoutExt.luac
mercury|moo|./output/$fileNameWithoutExt
mmixal|mms|./output/$fileNameWithoutExt.mmo
modula3|m3|./output/AMD64_LINUX/prog
mojo|mojo|./output/$fileName
nasm|nasm|./output/$fileNameWithoutExt
nim|nim|./output/$fileNameWithoutExt
oberon|Mod|./output/$fileNameWithoutExt
objectivec|m|./output/$fileNameWithoutExt
ocaml|ml|./output/$fileNameWithoutExt
octave|mat|./output/${fileNameWithoutExt}shaved.m
pascal|pas|./output/$fileNameWithoutExt
perl|plx|./output/$fileName
php|php|./output/$fileName
prolog|pl|./output/$fileNameWithoutExt
python|py|./output/$fileName
r|r|./output/$fileName
racket|rkt|./output/$fileNameWithoutExt
ruby|rb|./output/$fileName
rust|rs|./output/$fileNameWithoutExt
scala|scala|./output/$fileName
scheme|scm|./$fileName
simula|sim|./output/$fileNameWithoutExt
smalltalk|st|./$fileName
swift|swift|./output/$fileNameWithoutExt
tcl|tcl|./$fileName
typescript|ts|./output/$fileNameWithoutExt.js
v|v|./output/$fileNameWithoutExt
visualbasic|vb|./output/bin/Debug/net10.0/$fileNameWithoutExt
wat|wat|./output/$fileNameWithoutExt.wasm
zig|zig|./output/$fileNameWithoutExt
EOF
}

# Shared language key list used by list/flag helpers.
get_supported_language_keys() {
  get_language_catalog | awk -F'|' '{print $1}'
}

# Return 0 when one language key is supported.
is_supported_language_key() {
  targetLang="$1"
  get_language_catalog | awk -F'|' -v lang="$targetLang" '$1 == lang {found=1} END {exit(found ? 0 : 1)}'
}

# Return primary source extension for one language key.
get_extension_for_language_key() {
  targetLang="$1"
  get_language_catalog | awk -F'|' -v lang="$targetLang" '$1 == lang {print $2; found=1; exit} END {exit(found ? 0 : 1)}'
}

# Resolve language and test-file template from source extension.
get_runtime_binding_for_extension() {
  targetExt="$1"
  get_language_catalog | awk -F'|' -v ext="$targetExt" '$2 == ext {print $1 "|" $3; found=1; exit} END {exit(found ? 0 : 1)}'
}

# Normalize names for lightweight matching (lowercase alphanumeric only).
normalize_identifier() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]'
}

# Score how well one file basename matches the algorithm directory basename.
score_file_for_algorithm_name() {
  fileBase="$1"
  algoBase="$2"

  fileLower=$(printf '%s' "$fileBase" | tr '[:upper:]' '[:lower:]')
  algoLower=$(printf '%s' "$algoBase" | tr '[:upper:]' '[:lower:]')
  fileNorm=$(normalize_identifier "$fileBase")
  algoNorm=$(normalize_identifier "$algoBase")

  if [ "$fileBase" = "$algoBase" ]; then
    printf '%s\n' 0
    return
  fi
  if [ "$fileLower" = "$algoLower" ]; then
    printf '%s\n' 1
    return
  fi
  if [ -n "$fileNorm" ] && [ "$fileNorm" = "$algoNorm" ]; then
    printf '%s\n' 2
    return
  fi
  case "$algoNorm" in
    *"$fileNorm")
      if [ -n "$fileNorm" ]; then
        printf '%s\n' 3
        return
      fi
      ;;
  esac
  case "$algoNorm" in
    *"$fileNorm"*)
      if [ -n "$fileNorm" ]; then
        printf '%s\n' 4
        return
      fi
      ;;
  esac
  case "$fileNorm" in
    *"$algoNorm"*)
      if [ -n "$algoNorm" ]; then
        printf '%s\n' 5
        return
      fi
      ;;
  esac

  printf '%s\n' 99
}

# Resolve one language key to exactly one source file in cwd.
resolve_filename_for_language_key() {
  targetLang="$1"
  targetExt=$(get_extension_for_language_key "$targetLang") || return 1
  algoDirName="${PWD##*/}"

  matchCount=0
  matchedFile=""
  bestScore=999
  bestFile=""
  bestCount=0
  for sourceFile in ./*."$targetExt"; do
    [ -f "$sourceFile" ] || continue
    matchCount=$((matchCount + 1))
    candidateFile=${sourceFile#./}
    matchedFile="$candidateFile"

    candidateBase="${candidateFile%.*}"
    candidateScore=$(score_file_for_algorithm_name "$candidateBase" "$algoDirName")
    if [ "$candidateScore" -lt "$bestScore" ]; then
      bestScore="$candidateScore"
      bestFile="$candidateFile"
      bestCount=1
    elif [ "$candidateScore" -eq "$bestScore" ]; then
      bestCount=$((bestCount + 1))
    fi
  done

  if [ "$matchCount" -eq 1 ]; then
    printf '%s\n' "$matchedFile"
    return 0
  fi

  if [ "$matchCount" -gt 1 ] && [ "$bestScore" -lt 99 ] && [ "$bestCount" -eq 1 ]; then
    printf '%s\n' "$bestFile"
    return 0
  fi

  if [ "$matchCount" -eq 0 ]; then
    echo "No '*.$targetExt' source file found for language '$targetLang' in current directory." >&2
    echo "Naming standard: use <algorithm>.$targetExt (case-insensitive) or shortened suffix." >&2
  else
    echo "Multiple '*.$targetExt' source files found for language '$targetLang'; unable to choose unambiguously." >&2
    echo "Naming standard: use <algorithm>.$targetExt (case-insensitive) or shortened suffix, or pass filename explicitly." >&2
  fi
  return 1
}

# =============================================
# Quick Mode: Flags And Language Grid
# =============================================

# Read .flag-lang and return success when a language is flagged.
is_language_flagged() {
  targetLang="$1"
  [ -f ./.flag-lang ] || return 1
  grep -Fx -- "$targetLang" ./.flag-lang > /dev/null 2>&1
}

# Add one language to .flag-lang if not already present.
flag_language() {
  targetLang="$1"
  touch ./.flag-lang || return 1
  if ! is_language_flagged "$targetLang"; then
    printf '%s\n' "$targetLang" >> ./.flag-lang || return 1
  fi
  return 0
}

# Remove one language from .flag-lang if present.
unflag_language() {
  targetLang="$1"
  [ -f ./.flag-lang ] || return 0
  unflagTmp=$(mktemp "${TMPDIR:-/tmp}/derekalgos-unflag.XXXXXX") || return 1
  grep -Fxv -- "$targetLang" ./.flag-lang > "$unflagTmp"
  unflagRet="$?"
  if [ "$unflagRet" -gt 1 ]; then
    rm -f "$unflagTmp"
    return 1
  fi
  mv "$unflagTmp" ./.flag-lang || { rm -f "$unflagTmp"; return 1; }
  return 0
}

# Flag all supported languages.
flag_all_languages() {
  flagAllTmp=$(mktemp "${TMPDIR:-/tmp}/derekalgos-flag-all.XXXXXX") || return 1
  get_supported_language_keys > "$flagAllTmp" || { rm -f "$flagAllTmp"; return 1; }
  mv "$flagAllTmp" ./.flag-lang || { rm -f "$flagAllTmp"; return 1; }
  return 0
}

# Clear all flag entries.
clear_all_language_flags() {
  rm -f ./.flag-lang || return 1
  return 0
}

# Return success when the current directory contains at least one file with an extension.
dir_has_extension() {
  targetExt="$1"
  for sourceFile in ./*."$targetExt"; do
    [ -f "$sourceFile" ] && return 0
  done
  return 1
}

# Return success when there is at least one source file for the given language in cwd.
language_has_source_in_cwd() {
  langExt=$(get_extension_for_language_key "$1") || return 1
  dir_has_extension "$langExt"
}

# Print "present flagged" status bits for one language key.
get_language_grid_status() {
  statusLang="$1"
  statusPresent=0
  statusFlagged=0

  if language_has_source_in_cwd "$statusLang"; then
    statusPresent=1
  fi
  if is_language_flagged "$statusLang"; then
    statusFlagged=1
  fi

  printf '%s %s\n' "$statusPresent" "$statusFlagged"
}

# Return success when a language should be included for the selected grid mode.
should_include_language_in_grid() {
  includeMode="$1"
  includePresent="$2"
  includeFlagged="$3"

  if [ "$includeMode" = "problems" ] && [ "$includePresent" -eq 1 ] && [ "$includeFlagged" -eq 0 ]; then
    return 1
  fi
  return 0
}

# Return the visible label length, including flag marker width when present.
get_language_grid_label_len() {
  labelLang="$1"
  labelFlagged="$2"

  labelLen=${#labelLang}
  if [ "$labelFlagged" -eq 1 ]; then
    labelLen=$((labelLen + 1))
  fi
  printf '%s\n' "$labelLen"
}

# Print one grid cell for a language with color and optional flag marker.
print_language_grid_cell() {
  cellLang="$1"
  cellPresent="$2"
  cellFlagged="$3"
  cellWidth="$4"
  cellGreen="$5"
  cellYellow="$6"
  cellRed="$7"
  cellNormal="$8"

  if [ "$cellPresent" -eq 1 ]; then
    cellColor="$cellGreen"
  else
    cellColor="$cellYellow"
  fi

  cellPadding=$((cellWidth - ${#cellLang}))
  if [ "$cellFlagged" -eq 1 ]; then
    cellPadding=$((cellPadding - 1))
  fi
  if [ "$cellPadding" -lt 0 ]; then
    cellPadding=0
  fi

  if [ "$cellFlagged" -eq 1 ]; then
    printf "  %b%s%b%bF%b%*s" "$cellColor" "$cellLang" "$cellNormal" "$cellRed" "$cellNormal" "$cellPadding" ""
  else
    printf "  %b%s%b%*s" "$cellColor" "$cellLang" "$cellNormal" "$cellPadding" ""
  fi
}

# Print the supported language list with color indicating source presence in cwd.
print_language_presence_grid() {
  gridMode="$1"
  if [ -z "$gridMode" ]; then
    gridMode="all"
  fi

  gridGreen='\033[0;32m'
  gridYellow='\033[0;33m'
  gridRed='\033[0;31m'
  gridNormal='\033[0m'

  maxLabelLen=0
  for langName in $(get_supported_language_keys); do
    read -r langPresent langFlagged <<EOF
$(get_language_grid_status "$langName")
EOF
    if ! should_include_language_in_grid "$gridMode" "$langPresent" "$langFlagged"; then
      continue
    fi

    langLen=$(get_language_grid_label_len "$langName" "$langFlagged")
    if [ "$langLen" -gt "$maxLabelLen" ]; then
      maxLabelLen="$langLen"
    fi
  done

  colWidth=$((maxLabelLen + 3))
  displayCols=$(get_display_columns)
  colsPerRow=$((displayCols / colWidth))
  if [ "$colsPerRow" -lt 1 ]; then
    colsPerRow=1
  fi

  if [ "$gridMode" = "problems" ]; then
    echo "Language problems in current directory: $PWD"
  else
    echo "Language availability in current directory: $PWD"
  fi

  currentCol=0
  displayedCount=0
  for langName in $(get_supported_language_keys); do
    read -r langPresent langFlagged <<EOF
$(get_language_grid_status "$langName")
EOF
    if ! should_include_language_in_grid "$gridMode" "$langPresent" "$langFlagged"; then
      continue
    fi

    print_language_grid_cell "$langName" "$langPresent" "$langFlagged" "$colWidth" "$gridGreen" "$gridYellow" "$gridRed" "$gridNormal"

    displayedCount=$((displayedCount + 1))
    currentCol=$((currentCol + 1))
    if [ "$currentCol" -ge "$colsPerRow" ]; then
      printf '\n'
      currentCol=0
    fi
  done
  if [ "$currentCol" -ne 0 ]; then
    printf '\n'
  fi

  if [ "$displayedCount" -eq 0 ]; then
    echo "  <none>"
  fi

  printf "Key: %bpresent%b, %bnot present%b, %bF%b flagged\n" "$gridGreen" "$gridNormal" "$gridYellow" "$gridNormal" "$gridRed" "$gridNormal"
  echo "Hint: use --flag=<language> to mark and --unflag=<language> to clear flags in ./.flag-lang"
}

# =============================================
# Did-You-Mean Suggestion Helpers
# =============================================

# Print supported help topics for did-you-mean matching.
print_help_topic_catalog() {
  print_help_topic_catalog_for_script run
}

# Suggest the closest check-only route token.
suggest_check_only_route_for_unknown() {
  unknownRoute="$1"
  routeCatalog="native
docker
ssh"
  suggest_from_catalog "$unknownRoute" "$routeCatalog" | head -n 1
}

# Suggest the closest clean option token.
suggest_clean_option_for_unknown() {
  unknownCleanOption="$1"
  cleanOptionCatalog="--defaults
--defaults="
  suggest_from_catalog "$unknownCleanOption" "$cleanOptionCatalog" | head -n 1
}

# Suggest the closest supported language key.
suggest_language_key_for_unknown() {
  unknownLanguageKey="$1"
  languageCatalog="$(get_supported_language_keys)
all
none"
  suggest_from_catalog "$unknownLanguageKey" "$languageCatalog" | head -n 1
}

# =============================================
# Runtime Helpers: Argument Parsing And Bootstrap
# =============================================

# Populate runtime context values after filename resolution.
initialize_runtime_context_for_selected_file() {
  fileNameWithoutExt="${fileName%.*}"
  fileExtension="${fileName##*.}"
  className=$(echo "$fileNameWithoutExt" | tr '[:lower:]' '[:upper:]')

  currentCpuArch=$(uname -m)
  currentPlatform=$(uname -s)
  startDir=$PWD
  dir="${PWD%/*}"
  packName="${dir##*/}"
  algoName="${PWD##*/}"
  moduleName="$(echo "$fileNameWithoutExt" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"

  hostCpuArch="$currentCpuArch"
  hostPlatform="$currentPlatform"
  hostTranslation="n/a"
  if [ "$currentPlatform" = "Darwin" ] && command -v sysctl > /dev/null 2>&1; then
    rosetta_state=$(sysctl -in sysctl.proc_translated 2>/dev/null)
    case "$rosetta_state" in
      1) hostTranslation="rosetta-translated" ;;
      0) hostTranslation="native" ;;
      *) hostTranslation="unknown" ;;
    esac
  fi
}

# Finalize runtime environment config before build/dispatch.
configure_runtime_environment() {
  export DEREKALGOS_LAST_COMMAND_OUTPUT_LOG="$lastCommandOutputLog"

  # Decide what date command we're going to use.
  dateCmd="date"
  case "$currentPlatform" in
    "FreeBSD"|"Darwin")
      if command -v gdate > /dev/null 2>&1; then
        dateCmd="gdate"
      fi
      ;;
    *) ;;
  esac

  # Refresh shell profile.
  # - Default behavior follows existing platform profile sourcing.
  # - --source-profile=<path> overrides with a specific profile.
  # - --source-profile= (empty) disables profile sourcing.
  profileOutCacheDir="$HOME/.cache/derekalgos"
  profileOutCache="$profileOutCacheDir/profile.log"
  mkdir -p "$profileOutCacheDir" || profileOutCache="${TMPDIR:-/tmp}/derekalgos-profile.log"
  if [ "$sourceProfileOverrideSet" -eq 1 ]; then
    if [ -n "$sourceProfileOverridePath" ]; then
      # If profile sourcing fails (missing file, parse error, etc), continue anyway by design.
      . "$sourceProfileOverridePath" >> "$profileOutCache" 2>&1
    fi
  else
    # NOTE: determine_profile_for_platform resolves Linux to ~/.bash_profile.
    # That Linux resolution also covers Docker containers: Docker reports "Linux"
    # from uname -s and runs as root, so ~/.bash_profile resolves to /root/.bash_profile.
    # Any Docker image used as a runner for this project must write DEREKALGOS_* defaults
    # to /root/.bash_profile so this profile-source can load them — this is the supported
    # and only supported contract for Docker runners. This project's own Dockerfile
    # (see: Dockerfile at repo root) is the canonical reference implementation of that
    # contract: its final RUN block writes the DEREKALGOS_* defaults to that exact path.
    # IMPORTANT: linux/amd64 is the fully supported Docker platform; linux/arm64 has
    # limited support and may work via emulation or a compatible image but is not
    # guaranteed. No other Docker platform or architecture has a supported path today.
    defaultProfilePath=$(determine_profile_for_platform "$currentPlatform")
    if [ -n "$defaultProfilePath" ]; then
      . "$defaultProfilePath" >> "$profileOutCache" 2>&1
    fi
  fi

  if [ -n "$DEREKALGOS_TIMEOUT" ]; then
    timeoutConfig="$DEREKALGOS_TIMEOUT"
    timeoutFromHost=1
  fi
  if [ -z "$timeoutConfig" ]; then
    timeoutConfig="-k 10s 2m"
  fi
  export DEREKALGOS_TIMEOUT="$timeoutConfig"

  detect_time_precision

  repoRootPath=$(resolve_abs_path "$startDir/../../../")
  startDirFromRepo=
  case "$startDir" in
    "$repoRootPath") startDirFromRepo="" ;;
    "$repoRootPath"/*) startDirFromRepo=${startDir#"$repoRootPath"/} ;;
    *) startDirFromRepo="" ;;
  esac
}

# Scan for quick-mode options in the original argv list.
scan_quick_mode_from_args() {
  for rawArg in "$@"; do
    case "$rawArg" in
      --list-languages|--list-langauges)
        if [ -z "$quickMode" ]; then
          quickMode="list"
        else
          quickModeIgnoredArgs="$quickModeIgnoredArgs $rawArg"
        fi
        ;;
      --list-problems)
        if [ -z "$quickMode" ]; then
          quickMode="problems"
        else
          quickModeIgnoredArgs="$quickModeIgnoredArgs $rawArg"
        fi
        ;;
      --flag=*)
        if [ -z "$quickMode" ]; then
          quickMode="flag"
          quickModeValue=${rawArg#--flag=}
        else
          quickModeIgnoredArgs="$quickModeIgnoredArgs $rawArg"
        fi
        ;;
      --unflag=*)
        if [ -z "$quickMode" ]; then
          quickMode="unflag"
          quickModeValue=${rawArg#--unflag=}
        else
          quickModeIgnoredArgs="$quickModeIgnoredArgs $rawArg"
        fi
        ;;
      *)
        quickModeIgnoredArgs="$quickModeIgnoredArgs $rawArg"
        ;;
    esac
  done

  quickModeIgnoredArgs=$(printf '%s\n' "$quickModeIgnoredArgs" | awk '{$1=$1;print}')
}

# Execute quick mode when requested; exits on completion.
maybe_handle_quick_mode_and_exit() {
  if [ -z "$quickMode" ]; then
    return 0
  fi

  if [ -n "$quickModeIgnoredArgs" ]; then
    case "$quickMode" in
      list) echo "WARNING: --list-languages ignores all other arguments/options. Ignored: $quickModeIgnoredArgs" >&2 ;;
      problems) echo "WARNING: --list-problems ignores all other arguments/options. Ignored: $quickModeIgnoredArgs" >&2 ;;
      flag) echo "WARNING: --flag ignores all other arguments/options. Ignored: $quickModeIgnoredArgs" >&2 ;;
      unflag) echo "WARNING: --unflag ignores all other arguments/options. Ignored: $quickModeIgnoredArgs" >&2 ;;
    esac
  fi

  case "$quickMode" in
    list)
      print_language_presence_grid
      exit 0
      ;;
    problems)
      print_language_presence_grid "problems"
      exit 0
      ;;
    flag|unflag)
      if [ -z "$quickModeValue" ]; then
        echo "Missing language key for --$quickMode." >&2
        exit 64
      fi
      case "$quickModeValue" in
        all)
          if [ "$quickMode" = "flag" ]; then
            if ! flag_all_languages; then
              echo "Failed to update ./.flag-lang for --flag=all" >&2
              exit 1
            fi
          else
            if ! clear_all_language_flags; then
              echo "Failed to update ./.flag-lang for --unflag=all" >&2
              exit 1
            fi
          fi
          ;;
        none)
          if ! clear_all_language_flags; then
            echo "Failed to update ./.flag-lang for --$quickMode=none" >&2
            exit 1
          fi
          ;;
        *)
          if ! is_supported_language_key "$quickModeValue"; then
            echo "Unknown language key '$quickModeValue' for --$quickMode." >&2
            languageSuggestion=$(suggest_language_key_for_unknown "$quickModeValue")
            if [ -n "$languageSuggestion" ]; then
              echo "Did you mean: --$quickMode=$languageSuggestion" >&2
            fi
            exit 64
          fi
          if [ "$quickMode" = "flag" ]; then
            if ! flag_language "$quickModeValue"; then
              echo "Failed to update ./.flag-lang for --flag=$quickModeValue" >&2
              exit 1
            fi
          else
            if ! unflag_language "$quickModeValue"; then
              echo "Failed to update ./.flag-lang for --unflag=$quickModeValue" >&2
              exit 1
            fi
          fi
          ;;
      esac
      print_language_presence_grid
      exit 0
      ;;
  esac
}

# Parse non-quick options and count consumed option args.
parse_standard_cli_options_or_exit() {
  parsedCliArgCount=0

  while [ $# -ge 1 ]; do
    case "$1" in
      --source-profile=*)
        sourceProfileOverrideSet=1
        sourceProfileOverridePath=${1#--source-profile=}
        parsedCliArgCount=$((parsedCliArgCount + 1))
        shift 1
        ;;
      --check-only)
        checkOnlyMode=1
        checkOnlyRoute="native"
        parsedCliArgCount=$((parsedCliArgCount + 1))
        shift 1
        ;;
      --check-only=*)
        checkOnlyMode=1
        checkOnlyRoute=${1#--check-only=}
        if [ -z "$checkOnlyRoute" ]; then
          checkOnlyRoute="native"
        fi
        parsedCliArgCount=$((parsedCliArgCount + 1))
        shift 1
        ;;
      --compile-only)
        compileOnlyMode=1
        parsedCliArgCount=$((parsedCliArgCount + 1))
        shift 1
        ;;
      --smoke-test)
        shift 1

        for smokeArg in "$@"; do
          case "$smokeArg" in
            --langs=*|--timeout=*|--slow-timeout=*|--markdown|--markdown=*)
              ;;
            *)
              echo "Unsupported argument after --smoke-test: $smokeArg" >&2
              echo "Usage: $0 --smoke-test [--langs=\"lang1 lang2\"] [--timeout=<dur>] [--slow-timeout=<dur>] [--markdown[=<path>]]" >&2
              exit 64
              ;;
          esac
        done

        smokeScriptPath="$scriptDir/shlib/run-smoke-test.sh"
        if [ ! -r "$smokeScriptPath" ]; then
          echo "Smoke test script missing or unreadable: $smokeScriptPath" >&2
          exit 78
        fi

        sh "$smokeScriptPath" --dir="$PWD" "$@"
        exit "$?"
        ;;
      --help|-h)
        print_usage_short
        exit 0
        ;;
      --help-all)
        print_usage_full
        exit 0
        ;;
      --help=*)
        helpTopic=${1#--help=}
        if ! print_usage_topic "$helpTopic"; then
          exit 64
        fi
        exit 0
        ;;
      *)
        if [ "${1#--}" != "$1" ]; then
          echo "Unknown option: $1" >&2
          optionSuggestion=$(suggest_option_for_unknown "$1")
          if [ -n "$optionSuggestion" ]; then
            echo "Did you mean: $optionSuggestion" >&2
          fi
          exit 64
        fi
        break
        ;;
    esac
  done

  if [ $# -lt 1 ]; then
    print_usage
    exit 64
  fi
}

# Validate route controls and normalize check-only/compile-only interactions.
validate_execution_route_controls_or_exit() {
  case "$checkOnlyRoute" in
    "native"|"docker"|"ssh") ;;
    *)
      echo "Unsupported check-only route '$checkOnlyRoute' (expected: native, docker, or ssh)." >&2
      routeSuggestion=$(suggest_check_only_route_for_unknown "$checkOnlyRoute")
      if [ -n "$routeSuggestion" ]; then
        echo "Did you mean: --check-only=$routeSuggestion" >&2
      fi
      exit 64
      ;;
  esac

  if [ "$checkOnlyMode" -eq 1 ]; then
    compileOnlyMode=0
  fi
}

# Resolve filename from first positional arg (language key or explicit file).
resolve_target_filename_or_exit() {
  resolveTargetArg="$1"
  resolveTargetLower=$(printf '%s' "$resolveTargetArg" | tr '[:upper:]' '[:lower:]')

  if is_supported_language_key "$resolveTargetLower"; then
    resolvedFileName=$(resolve_filename_for_language_key "$resolveTargetLower")
    if [ -z "$resolvedFileName" ]; then
      exit 64
    fi
    fileName="$resolvedFileName"
  else
    fileName="$resolveTargetArg"
  fi
}

# =============================================
# Runtime Helpers: Logging, Routing, And Utilities
# =============================================

# Initialize and write the run header to the command output log.
init_last_command_output_log() {
  mkdir -p ./output
  : > "$lastCommandOutputLog"
  if command -v date > /dev/null 2>&1; then
    run_header_time=$(date '+%Y-%m-%d %H:%M:%S %Z')
  else
    run_header_time="unknown-time"
  fi
  run_header_route="${DEREKALGOS_EXECUTION_ROUTE:-native}"
  run_header_cwd="$PWD"
  if [ -n "$DEREKALGOS_HOST_CWD" ]; then
    run_header_cwd="$DEREKALGOS_HOST_CWD"
  fi
  {
    echo "==== RUN START ===="
    echo "time: $run_header_time"
    echo "cwd: $run_header_cwd"
    if [ -n "$DEREKALGOS_HOST_CWD" ]; then
      echo "container-cwd: $PWD"
    fi
    if [ -n "$DEREKALGOS_HOST_CPUARCH" ]; then
      echo "host-cpu: $DEREKALGOS_HOST_CPUARCH"
    fi
    if [ -n "$DEREKALGOS_HOST_PLATFORM" ]; then
      echo "host-platform: $DEREKALGOS_HOST_PLATFORM"
    fi
    if [ -n "$DEREKALGOS_HOST_TRANSLATION" ]; then
      echo "host-translation: $DEREKALGOS_HOST_TRANSLATION"
    fi
    echo "file: $fileName"
    echo "ext: $fileExtension"
    echo "cpu: $currentCpuArch"
    echo "platform: $currentPlatform"
    echo "route: $run_header_route"
    echo "timeout: $timeoutConfig"
    echo "check-only: $checkOnlyMode"
    echo "check-only-route: $checkOnlyRoute"
    echo "compile-only: $compileOnlyMode"
    echo "==================="
  } >> "$lastCommandOutputLog"
  export DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE=1
}

# Detect whether the local date command supports millisecond precision.
detect_time_precision() {
  ms_sample=$($dateCmd +%s%3N 2>/dev/null)
  case "$ms_sample" in
    ''|*[!0-9]*)
      timePrecisionUnit="s"
      ;;
    *)
      timePrecisionUnit="ms"
      ;;
  esac
}

# Return current time in detected precision units.
get_ms_time() {
  if [ "$timePrecisionUnit" = "ms" ]; then
    $dateCmd +%s%3N
  else
    $dateCmd +%s
  fi
}

# Render a template string with shell variable expansion.
get_variabled_string() {
  # WARNING: eval-based templating is intentionally retained for now; replace with safer rendering when practical.
  eval "cat <<EOF
$1
EOF"
}

# Resolve a language route from a space-separated lang=value map.
get_lang_route_value() {
  route_map="$1"
  route_lang="$2"
  printf '%s\n' "$route_map" | awk -v key="$route_lang" '{
    for (i = 1; i <= NF; i++) {
      split($i, pair, "=")
      if (pair[1] == key) {
        print substr($i, length(key) + 2)
        exit
      }
    }
  }'
}

# Resolve a path to an absolute canonical path.
resolve_abs_path() {
  if command -v realpath > /dev/null 2>&1; then
    realpath "$1"
  else
    (
      cd "$1" 2>/dev/null && pwd -P
    )
  fi
}


# Archive the final run inputs and output log to repository-level logs.
generate_random_hex_suffix() {
  if [ -r /dev/urandom ] && command -v od > /dev/null 2>&1; then
    randomHex=$(od -An -N4 -tx4 /dev/urandom 2>/dev/null | tr -d '[:space:]')
    if [ -n "$randomHex" ]; then
      printf '%s\n' "$randomHex"
      return 0
    fi
  fi
  printf '%s\n' "$$"
}

# Add one relative path to the source archive list when present.
add_archive_input_if_exists() {
  archiveListFile="$1"
  archiveRepoRelPath="$2"

  archiveRepoRelPath=${archiveRepoRelPath#./}
  case "$archiveRepoRelPath" in
    ''|/*) return 0 ;;
  esac
  case "/$archiveRepoRelPath/" in
    */../*) return 0 ;;
  esac

  if [ -e "$repoRootPath/$archiveRepoRelPath" ]; then
    printf '%s\n' "$archiveRepoRelPath" >> "$archiveListFile"
  fi
}

# Add prebuilt stdlib archive for one target, or add a missing-archive marker.
add_stdlib_prebuilt_archive_or_marker() {
  archiveListFile="$1"
  stdlibTarget="$2"
  stdlibArchiveRel="stdlib/output/stdlib-${stdlibTarget}-archive.tar.gz"
  if [ -e "$repoRootPath/$stdlibArchiveRel" ]; then
    add_archive_input_if_exists "$archiveListFile" "$stdlibArchiveRel"
    return 0
  fi

  mkdir -p "$startDir/output"

# =============================================
# Archive And Log Capture Helpers
# =============================================

  missingMarkerBase="stdlib-prebuilt-archive-missing-${stdlibTarget}.txt"
  missingMarkerAbs="$startDir/output/$missingMarkerBase"
  {
    echo "Missing prebuilt stdlib archive for this build target."
    echo "expected: $stdlibArchiveRel"
    echo "context: lang=${lang:-unknown} target=$stdlibTarget"
    echo "fallback: disabled"
  } > "$missingMarkerAbs"

  missingMarkerRel="output/$missingMarkerBase"
  if [ -n "$startDirFromRepo" ]; then
    missingMarkerRel="$startDirFromRepo/output/$missingMarkerBase"
  fi
  add_archive_input_if_exists "$archiveListFile" "$missingMarkerRel"
  return 0
}

# Add the active run log to the archive input list.
add_last_command_log_to_archive() {
  archiveListFile="$1"
  if [ -z "$lastCommandOutputLog" ]; then
    return 0
  fi

  archiveLogRepoRel=
  case "$lastCommandOutputLog" in
    /*)
      case "$lastCommandOutputLog" in
        "$repoRootPath"/*) archiveLogRepoRel=${lastCommandOutputLog#"$repoRootPath"/} ;;
        *) archiveLogRepoRel= ;;
      esac
      ;;
    *)
      archiveLogRel=${lastCommandOutputLog#./}
      if [ -n "$startDirFromRepo" ]; then
        archiveLogRepoRel="$startDirFromRepo/$archiveLogRel"
      else
        archiveLogRepoRel="$archiveLogRel"
      fi
      ;;
  esac

  if [ -n "$archiveLogRepoRel" ]; then
    add_archive_input_if_exists "$archiveListFile" "$archiveLogRepoRel"
  fi
}

# Default source archive rule: include only the requested source file.
default_lang_archive() {
  archiveListFile="$1"
  if [ -n "$startDirFromRepo" ]; then
    add_archive_input_if_exists "$archiveListFile" "$startDirFromRepo/$fileName"
  else
    add_archive_input_if_exists "$archiveListFile" "$fileName"
  fi
}

# Collect archive inputs by invoking the language-specific archive hook.
collect_lang_archive_inputs() {
  archiveListFile="$1"
  archiveMethod="${lang}_archive"
  if command -v "$archiveMethod" > /dev/null 2>&1; then
    "$archiveMethod" "$archiveListFile"
  else
    default_lang_archive "$archiveListFile"
  fi
}

# Archive the entire output directory (repo-relative), plus sources.
create_lang_input_archive() {
  archiveDestination="$1"
  archiveListFile=$(make_temp_file_secure "source-archive" "${TMPDIR:-/tmp}") || return 1
  : > "$archiveListFile"

  include_output_dir=0
  # Always include the output directory (repo-relative path)
  if [ -d "$startDir/output" ]; then
    if [ -n "$startDirFromRepo" ]; then
      echo "$startDirFromRepo/output" >> "$archiveListFile"
    else
      echo "output" >> "$archiveListFile"
    fi
    include_output_dir=1
  fi

  # Only add the log file if output dir is not included
  if [ "$include_output_dir" -eq 0 ]; then
    add_last_command_log_to_archive "$archiveListFile"
  fi
  collect_lang_archive_inputs "$archiveListFile"
  if [ ! -s "$archiveListFile" ]; then
    rm -f "$archiveListFile"
    return 1
  fi

  if command -v sort > /dev/null 2>&1; then
    sort -u "$archiveListFile" -o "$archiveListFile"
  fi

  (
    cd "$repoRootPath" 2>/dev/null || exit 1
    tar -czf "$archiveDestination" -T "$archiveListFile"
  )
  archiveRet="$?"
  rm -f "$archiveListFile"
  return "$archiveRet"
}

# Create a .tar.gz from the collected source inputs and outputs.
archive_last_command_output_log() {
  if [ -n "$DEREKALGOS_LAST_COMMAND_OUTPUT_ARCHIVED" ]; then
    return 0
  fi
  DEREKALGOS_LAST_COMMAND_OUTPUT_ARCHIVED=1

  if [ -z "$lastCommandOutputLog" ] || [ ! -f "$lastCommandOutputLog" ]; then
    return 0
  fi

  # Relay children (docker-relay, ssh-relay) must not archive; only the host does.
  case "${DEREKALGOS_EXECUTION_ROUTE:-native}" in
    *-relay) return 0 ;;
  esac

  logsDir="$repoRootPath/archive"
  if ! mkdir -p "$logsDir" 2>/dev/null; then
    return 0
  fi
  chmod -R a+rwX "$logsDir" 2>/dev/null || true

  if archiveTimestamp=$($dateCmd +%Y%m%d-%H%M%S 2>/dev/null); then
    :
  elif archiveTimestamp=$(date +%Y%m%d-%H%M%S 2>/dev/null); then
    :
  else
    archiveTimestamp="unknown-time"
  fi
  archiveLang="$lang"
  if [ -z "$archiveLang" ]; then
    archiveLang="unknown"
  fi
  archiveLang=$(printf '%s' "$archiveLang" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9._-' '-')
  archiveLang=$(printf '%s' "$archiveLang" | sed 's/^-*//; s/-*$//')
  if [ -z "$archiveLang" ]; then
    archiveLang="unknown"
  fi
  randomSuffix=$(generate_random_hex_suffix)
  archivedInputPath="$logsDir/build-${archiveTimestamp}-${archiveLang}-${randomSuffix}.tar.gz"

  didArchiveWrite=0

  if create_lang_input_archive "$archivedInputPath"; then
    ln -sfn "$(basename "$archivedInputPath")" "$logsDir/last-build.tar.gz" 2>/dev/null || true
    didArchiveWrite=1
  else
    echo "WARNING: failed to create source archive at $archivedInputPath" >&2
  fi
  if [ "$didArchiveWrite" -eq 1 ]; then
    chmod -R a+rwX "$logsDir" 2>/dev/null || true
  fi
}

# =============================================
# Timeout Helpers
# =============================================

# Validate timeout tokens like 10s, 2m, 1h, or 1d.
is_valid_duration_token() {
  duration_token="$1"
  case "$duration_token" in
    ''|*[!0-9smhd]*) return 1 ;;
    *[smhd]) ;;
    *) return 1 ;;
  esac

  duration_number=${duration_token%[smhd]}
  case "$duration_number" in
    ''|*[!0-9]*) return 1 ;;
  esac

  return 0
}

# Convert duration tokens to numeric seconds for sleep.
duration_to_seconds() {
  case "$1" in
    *s) printf '%s\n' "${1%s}" ;;
    *m) printf '%d\n' $(( ${1%m} * 60 )) ;;
    *h) printf '%d\n' $(( ${1%h} * 3600 )) ;;
    *d) printf '%d\n' $(( ${1%d} * 86400 )) ;;
    *)  printf '%s\n' "$1" ;;
  esac
}

# Parse timeoutConfig into main timeout and optional kill-after timeout.
parse_timeout_config() {
  parsed_timeout_main="1m"
  parsed_timeout_kill=

  case "$timeoutConfig" in
    '-k '*)
      timeout_tokens="${timeoutConfig#-k }"
      timeout_kill_token="${timeout_tokens%% *}"
      timeout_main_token="${timeout_tokens##* }"
      if [ "${timeout_kill_token} ${timeout_main_token}" = "$timeout_tokens" ] && \
         is_valid_duration_token "$timeout_kill_token" && \
         is_valid_duration_token "$timeout_main_token"; then
        parsed_timeout_kill="$timeout_kill_token"
        parsed_timeout_main="$timeout_main_token"
      else
        if [ -n "$lastCommandOutputLog" ]; then
          echo "WARNING: invalid timeout '$timeoutConfig'; falling back to '1m'" >> "$lastCommandOutputLog"
        fi
      fi
      ;;
    *)
      if is_valid_duration_token "$timeoutConfig"; then
        parsed_timeout_main="$timeoutConfig"
      else
        if [ -n "$lastCommandOutputLog" ]; then
          echo "WARNING: invalid timeout '$timeoutConfig'; falling back to '1m'" >> "$lastCommandOutputLog"
        fi
      fi
      ;;
  esac
}

# Parse timeout config and convert values to seconds.
parse_timeout_seconds() {
  parse_timeout_config
  parsed_timeout_main_seconds=$(duration_to_seconds "$parsed_timeout_main")
  if [ -n "$parsed_timeout_kill" ]; then
    parsed_timeout_kill_seconds=$(duration_to_seconds "$parsed_timeout_kill")
  else
    parsed_timeout_kill_seconds=
  fi
}

# Start a background watcher that enforces timeout and kill-after.
run_with_timeout_watcher() {
  watcher_pid="$1"
  watcher_flag_file="$2"
  watcher_main_seconds="$3"
  watcher_kill_seconds="$4"
  watcher_force_kill_seconds="${watcher_kill_seconds:-1}"

  (
    sleep "$watcher_main_seconds"
    if kill -0 "$watcher_pid" 2>/dev/null; then
      : > "$watcher_flag_file"
      kill -TERM "$watcher_pid" 2>/dev/null
      sleep "$watcher_force_kill_seconds"
      kill -KILL "$watcher_pid" 2>/dev/null
    fi
  ) &
  started_watcher_pid="$!"
}

# Wait for the run process, then stop and reap the timeout watcher.
wait_for_run_and_watcher() {
  wait_run_pid="$1"
  wait_watcher_pid="$2"

  wait "$wait_run_pid"
  waited_run_rc="$?"

  kill "$wait_watcher_pid" 2>/dev/null
  wait "$wait_watcher_pid" 2>/dev/null
}

# Run a function with timeout enforcement and consolidated logging.
run_with_log_and_timeout() {
  _rwlt_log="$1"
  _rwlt_func="$2"
  shift 2
  # $@ is now the program arguments only

  parse_timeout_seconds

  (
    _tmp=$(make_temp_file_secure "relay" "${TMPDIR:-/tmp}") || {
      echo "ERROR: unable to create run output temp file" >&2
      exit 1
    }
    _flag=$(make_temp_file_secure "timeout" "${TMPDIR:-/tmp}") || {
      echo "ERROR: unable to create timeout flag file" >&2
      exit 1
    }
    rm -f "$_flag"
    trap 'rm -f "$_tmp" "$_flag"' INT TERM HUP EXIT

    "$_rwlt_func" "$@" > "$_tmp" 2>&1 &
    _pid="$!"

    run_with_timeout_watcher "$_pid" "$_flag" "$parsed_timeout_main_seconds" "$parsed_timeout_kill_seconds"
    _watcher="$started_watcher_pid"
    wait_for_run_and_watcher "$_pid" "$_watcher"
    _rc="$waited_run_rc"

    flush_output_to_logs "$_tmp" "$_rwlt_log" "run output"

    if [ -f "$_flag" ]; then
      exit 124
    fi
    exit "$_rc"
  )
  return "$?"
}

# =============================================
# Assembly Shared Build Helpers
# =============================================

# Return success when source should rebuild object output.
should_rebuild_object_for_source() {
  objectPath="$1"
  if [ ! -f "$objectPath" ]; then
    return 0
  fi
  if [ -n "$(find "$fileName" -prune -newer "$objectPath" 2>/dev/null)" ]; then
    return 0
  fi
  return 1
}

# Return success when executable should be linked.
should_link_executable_for_stdlib() {
  binaryPath="$1"
  stdlibPath="$2"
  if [ ! -f "$binaryPath" ]; then
    return 0
  fi
  if [ -n "$(find "$stdlibPath" -prune -newer "$binaryPath" 2>/dev/null)" ]; then
    return 0
  fi
  return 1
}

# Run a command and preserve its return code for caller-side chaining.
run_or_return() {
  "$@"
  runOrReturnRet="$?"
  return "$runOrReturnRet"
}

# Build stdlib for assembly-family languages and merge logs.
build_assembly_stdlib_and_merge_log() {
  asmBuildLabel="$1"
  asmBuildLogPath="$2"
  asmPlatform="$3"
  asmPlatformOutputTag="$4"
  asmBuildContext="$5"

  echo "Building ${asmBuildLabel}..." > "$asmBuildLogPath"
  echo "Building ${asmBuildLabel} Standard Library..." >> "$asmBuildLogPath"
  cp "./$fileName" ./output/

  cd ../../../stdlib || {
    echo "Failed to cd into stdlib for ${asmBuildContext} build" >> "$startDir/$asmBuildLogPath"
    return 1
  }
  ./build.sh "$asmPlatform" >> "$startDir/$asmBuildLogPath" 2>&1
  retValue="$?"
  cd "$startDir" || {
    echo "Failed to return to start directory: $startDir" >> "$startDir/$asmBuildLogPath"
    return 1
  }
  if [ "$retValue" -ne 0 ]; then
    return "$retValue"
  fi

  cat "../../../stdlib/output/${asmPlatformOutputTag}-build-last" >> "$asmBuildLogPath"
  asmLogMergeRet="$?"
  if [ "$asmLogMergeRet" -ne 0 ]; then
    echo "WARNING: failed to append stdlib build log to $asmBuildLogPath (returned $asmLogMergeRet)" >&2
  fi

  return 0
}

# Resolve x64 assembly-family platform labels for compile paths.
resolve_x64_assembly_platform() {
  x64BuildKind="$1"
  x64BuildLogPath="$2"
  x64PlatformSuffix="$3"
  x64OutputSuffix="$4"

  platform="$currentPlatform"
  platform_output=
  case "$platform" in
    "MINGW64_NT"*)
      platform="Windows"
      platform_output="windows"
      ;;
    "Linux"*)
      platform="Linux"
      platform_output="linux"
      ;;
    "FreeBSD"*)
      platform="FreeBSD"
      platform_output="freebsd"
      ;;
    *)
      echo "Unrecognized Platform for ${x64BuildKind} Builds" > "$x64BuildLogPath"
      return 1
      ;;
  esac

  case "$currentCpuArch" in
    "x86_64"|"amd64")
      platform="${platform}${x64PlatformSuffix}"
      platform_output="${platform_output}${x64OutputSuffix}"
      ;;
    *)
      echo "Unrecognized CPU Architecture for ${x64BuildKind} Builds" > "$x64BuildLogPath"
      return 1
      ;;
  esac

  return 0
}

# Build x64 assembly-family object output for asm or nasm.
build_x64_assembly_object_output() {
  objectBuildKind="$1"
  objectBuildLogPath="$2"
  objectBuildPlatform="$3"

  case "$objectBuildKind" in
    "asm")
      case "$objectBuildPlatform" in
        "Windows-x64")
          echo "as -v --defsym WINDOWS=1 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> "$objectBuildLogPath"
          as -v --defsym WINDOWS=1 -o "./output/$fileNameWithoutExt.o" "$fileName" >> "$objectBuildLogPath" 2>&1
          retValue="$?"
          ;;
        *)
          echo "as -v --defsym WINDOWS=0 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> "$objectBuildLogPath"
          as -v --defsym WINDOWS=0 -o "./output/$fileNameWithoutExt.o" "$fileName" >> "$objectBuildLogPath" 2>&1
          retValue="$?"
          ;;
      esac
      echo "-- as returned: $retValue" >> "$objectBuildLogPath"
      ;;
    "nasm")
      case "$objectBuildPlatform" in
        "Windows-x64-nasm")
          echo "nasm -w+all -f win64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> "$objectBuildLogPath"
          nasm -w+all -f win64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> "$objectBuildLogPath" 2>&1
          retValue="$?"
          ;;
        *)
          echo "nasm -w+all -f elf64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> "$objectBuildLogPath"
          nasm -w+all -f elf64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> "$objectBuildLogPath" 2>&1
          retValue="$?"
          ;;
      esac
      echo "-- nasm returned: $retValue" >> "$objectBuildLogPath"
      ;;
    *)
      echo "Unsupported x64 object build kind '$objectBuildKind'" >> "$objectBuildLogPath"
      return 1
      ;;
  esac

  if [ "$retValue" -ne 0 ]; then
    return "$retValue"
  fi
  return 0
}

# Link x64 assembly-family executable output.
link_x64_assembly_binary_output() {
  linkBuildLogPath="$1"
  linkBuildPlatform="$2"
  linkBuildStdlib="$3"

  case "$linkBuildPlatform" in
    "Windows-x64"|"Windows-x64-nasm")
      echo "ld -v -e _start -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$linkBuildStdlib\" -L \"$LD_ADDITIONAL_DIRECTORY\" -lkernel32 -lshell32" >> "$linkBuildLogPath"
      ld -v -e _start -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$linkBuildStdlib" -L "$LD_ADDITIONAL_DIRECTORY" -lkernel32 -lshell32 >> "$linkBuildLogPath" 2>&1
      retValue="$?"
      ;;
    *)
      echo "ld -v -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$linkBuildStdlib\"" >> "$linkBuildLogPath"
      ld -v -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$linkBuildStdlib" >> "$linkBuildLogPath" 2>&1
      retValue="$?"
      ;;
  esac
  echo "-- ld returned: $retValue" >> "$linkBuildLogPath"
  if [ "$retValue" -ne 0 ]; then
    return "$retValue"
  fi
  return 0
}

# Build arm64 assembly object output.
build_arm64_assembly_object_output() {
  arm64ObjectBuildLogPath="$1"

  echo "as -v -arch arm64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> "$arm64ObjectBuildLogPath"
  as -v -arch arm64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> "$arm64ObjectBuildLogPath" 2>&1
  retValue="$?"
  echo "-- as returned: $retValue" >> "$arm64ObjectBuildLogPath"
  if [ "$retValue" -ne 0 ]; then
    return "$retValue"
  fi
  return 0
}

# Link arm64 assembly executable output.
link_arm64_assembly_binary_output() {
  arm64LinkBuildLogPath="$1"
  arm64LinkBuildStdlib="$2"

  echo "ld -v -e _start -arch arm64 -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$arm64LinkBuildStdlib\" -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path)" >> "$arm64LinkBuildLogPath"
  ld -v -e _start -arch arm64 -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$arm64LinkBuildStdlib" -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path) >> "$arm64LinkBuildLogPath" 2>&1
  retValue="$?"
  echo "-- ld returned: $retValue" >> "$arm64LinkBuildLogPath"
  if [ "$retValue" -ne 0 ]; then
    return "$retValue"
  fi
  return 0
}

# Runtime bootstrap and CLI parsing are intentionally kept together here,
# just above the script entrypoint, to keep helper/function definitions readable.
# Major runtime variable initialization for the run-now block.
sourceProfileOverrideSet=0
sourceProfileOverridePath=
checkOnlyMode=0
checkOnlyRoute="native"
compileOnlyMode=0

quickMode=""
quickModeValue=""
quickModeIgnoredArgs=""

fileName=
lang=
testFile=
destroyOutput=0

lastCommandOutputLog="${DEREKALGOS_LAST_COMMAND_OUTPUT_LOG:-./output/last-command-output.log}"
timeoutConfig="${DEREKALGOS_TIMEOUT}"
timeoutFromHost=0
if [ -n "$timeoutConfig" ]; then
  timeoutFromHost=1
fi
timePrecisionUnit="ms"
hostTranslation="n/a"

scan_quick_mode_from_args "$@"
maybe_handle_quick_mode_and_exit

parse_standard_cli_options_or_exit "$@"

remainingOptionShiftCount="$parsedCliArgCount"
while [ "$remainingOptionShiftCount" -gt 0 ]; do
  shift 1
  remainingOptionShiftCount=$((remainingOptionShiftCount - 1))
done

validate_execution_route_controls_or_exit

resolve_target_filename_or_exit "$1"
shift 1

initialize_runtime_context_for_selected_file
configure_runtime_environment

# Definitions done, we start by checking for a check for the "clean"
# request.

trap 'archive_last_command_output_log' EXIT


if [ "$fileName" = "clean" ]; then
  rm -Rf ./output >> /dev/null 2>&1

  do_clean_stdlib=1
  do_clean_archive=1

  defaultsArg=
  if [ $# -gt 0 ]; then
    case "$1" in
      --defaults)
        defaultsArg="y|y"
        ;;
      --defaults=*)
        defaultsArg=${1#--defaults=}
        ;;
      *)
        echo "Unknown clean option: $1" >&2
        if [ "${1#--}" != "$1" ]; then
          cleanOptionSuggestion=$(suggest_clean_option_for_unknown "$1")
          if [ -n "$cleanOptionSuggestion" ]; then
            echo "Did you mean: $cleanOptionSuggestion" >&2
          fi
        fi
        echo "Usage: $0 clean [--defaults|--defaults=y|--defaults=n|--defaults=yes|--defaults=no|--defaults=y|n|--defaults=yes|no]" >&2
        exit 64
        ;;
    esac
    shift 1
  fi
  if [ $# -gt 0 ]; then
    echo "Unexpected argument(s) for clean: $*" >&2
    echo "Usage: $0 clean [--defaults|--defaults=y|--defaults=n|--defaults=yes|--defaults=no|--defaults=y|n|--defaults=yes|no]" >&2
    exit 64
  fi

  if [ -n "$defaultsArg" ]; then
    case "$defaultsArg" in
      y|Y|[Yy][Ee][Ss])
        defaultsArg="y|y"
        ;;
      n|N|[Nn][Oo])
        defaultsArg="n|n"
        ;;
    esac

    stdlibDefault=${defaultsArg%%|*}
    archiveDefault=${defaultsArg##*|}
    if [ -z "$stdlibDefault" ] || [ -z "$archiveDefault" ] || [ "$defaultsArg" = "$stdlibDefault" ]; then
      echo "Invalid --defaults value '$defaultsArg'. Expected y, n, yes, no, y|n, n|y, yes|no, yes|yes, or no|no." >&2
      exit 64
    fi

    case "$stdlibDefault" in
      y|Y|[Yy][Ee][Ss]) do_clean_stdlib=1 ;;
      n|N|[Nn][Oo]) do_clean_stdlib=0 ;;
      *)
        echo "Invalid stdlib default '$stdlibDefault' in --defaults=$defaultsArg (expected y/n or yes/no)." >&2
        exit 64
        ;;
    esac
    case "$archiveDefault" in
      y|Y|[Yy][Ee][Ss]) do_clean_archive=1 ;;
      n|N|[Nn][Oo]) do_clean_archive=0 ;;
      *)
        echo "Invalid archive default '$archiveDefault' in --defaults=$defaultsArg (expected y/n or yes/no)." >&2
        exit 64
        ;;
    esac
  elif [ -t 0 ] || [ -t 1 ]; then
    # Interactive terminal: prompt before cleaning stdlib and archive
    printf "${yellow}About to clean stdlib (this will remove all stdlib build artifacts). Continue? [Y/n] ${normal}"
    read ans
    case "$ans" in
      ""|[Yy]*) do_clean_stdlib=1 ;;
      *) do_clean_stdlib=0 ;;
    esac
    printf "${yellow}About to remove ./archive (all build archives will be deleted). Continue? [Y/n] ${normal}"
    read ans
    case "$ans" in
      ""|[Yy]*) do_clean_archive=1 ;;
      *) do_clean_archive=0 ;;
    esac
  else
    # Non-interactive and no defaults provided: proceed with yes for both.
    do_clean_stdlib=1
    do_clean_archive=1
  fi

  if [ $do_clean_stdlib -eq 1 ]; then
    cd ../../../stdlib/ || { echo "Failed to cd to stdlib directory."; exit 1; }
    ./build.sh clean
    retValue=$?
    if [ "$retValue" -ne 0 ]; then
      echo "${red}Failed to clean stdlib. Returned $retValue.${normal}"
    else
      retValue=0
    fi
    cd ..
  else
    echo "Skipped cleaning stdlib."
    retValue=0
  fi

  if [ $do_clean_archive -eq 1 ]; then
    rm -Rf ./archive >> /dev/null 2>&1
  else
    echo "Skipped removing ./archive."
  fi

  cd "$startDir"
  exit $retValue
fi

# If we are not cleaning, resolve language and test output from extension.
runtimeBinding=$(get_runtime_binding_for_extension "$fileExtension")
if [ -z "$runtimeBinding" ]; then
  echo "Unrecognized file extension, not building!"
  exit 64
fi

lang=${runtimeBinding%%|*}
testTemplate=${runtimeBinding#*|}
# testTemplate is static catalog data; expand fileName variables in-place.
eval "testFile=\"$testTemplate\""

# Resolve and execute relay routes (docker/ssh). This returns only when no relay route is selected.
run_selected_relay_or_continue "$@"

# First thing, let's check to see if the output directory
# needs to be cleaned. This is the case if a different language
# was last to build for the given algorithm, and also
# if there are new updates to the code file.

if [ -f "./output/last-lang" ]; then
  if printf '%s' "$lang" | cmp -s - "./output/last-lang"; then
    if [ -n "$(find "./$fileName" -prune -newer "$testFile" 2>/dev/null)" ]; then
      destroyOutput=1
    fi
  else
    destroyOutput=1
  fi
else
  destroyOutput=1
fi

if [ "$destroyOutput" -eq 1 ]; then
  rm -Rf ./output >> ./clean-output 2>&1
  mkdir -p ./output
  mv ./clean-output ./output/
else
  mkdir -p ./output
fi

# Relay selection now exits inside run_selected_relay_or_continue.
# Reaching this point means local/native flow continues.
if [ -z "$DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE" ] || [ "$destroyOutput" -eq 1 ] || [ ! -f "$lastCommandOutputLog" ]; then
  init_last_command_output_log
fi

# Finally, run the compile for the specified language,
# and if successful, run it immediately.
# if the build fails, try to output the last build output

beforeCompile=$(get_ms_time)
echo "STARTING COMPILE: ${lang}_compile" >> "$lastCommandOutputLog"
if [ "$checkOnlyMode" -eq 1 ]; then
  echo "CHECK-ONLY: skipping compile and run for $lang" >> "$lastCommandOutputLog"
  echo "CHECK-ONLY: would run ${lang}_compile" >> "$lastCommandOutputLog"
  echo "CHECK-ONLY: would run ${lang}_run $*" >> "$lastCommandOutputLog"
  printf "\n    ${yellow}CHECK-ONLY: compile/run skipped for $lang.${normal}\n"
  printf "$lang" > ./output/last-lang
  chmod -R a+rwX ./output/
  exit 0
fi

run_and_log_output "$lastCommandOutputLog" "${lang}_compile"
compileRc="$?"
afterCompile=$(get_ms_time)
finalRc="$compileRc"
if [ -f "./output/${lang}-build-last" ]; then
  echo "---- ${lang}-build-last ----" >> "$lastCommandOutputLog"
  cat "./output/${lang}-build-last" >> "$lastCommandOutputLog"
  lang_log_append_ret="$?"
  if [ "$lang_log_append_ret" -ne 0 ]; then
    echo "WARNING: failed to append ./output/${lang}-build-last to $lastCommandOutputLog (returned $lang_log_append_ret)" >&2
  fi
fi

if [ "$compileRc" -eq 0 ]; then
  compile_duration=$((afterCompile - beforeCompile))
  if [ ! -f "$testFile" ]; then
    echo "Build returned successful for $lang, but output file not found.
Build output:

"
    cat "./output/${lang}-build-last"
  elif [ "$compileOnlyMode" -eq 1 ]; then
    timing_summary="Compile Time ${compile_duration}${timePrecisionUnit}; Run skipped (compile-only); Returned 0"
    echo "$timing_summary" >> "$lastCommandOutputLog"
    printf "\n    ${blue}Compile Time ${compile_duration}${timePrecisionUnit}; ${yellow}Run skipped (compile-only); ${green}Returned 0${normal}\n"
    finalRc=0
  else
    before_run=$(get_ms_time)
    echo "STARTING RUN: ${lang}_run" >> "$lastCommandOutputLog"
    run_with_log_and_timeout "$lastCommandOutputLog" "${lang}_run" "$@"
    run_rc="$?"
    finalRc="$run_rc"
    after_run=$(get_ms_time)

    run_duration=$((after_run - before_run))
    if [ "$timePrecisionUnit" = "s" ]; then
      timing_precision_note=" (second-level precision)"
    else
      timing_precision_note=
    fi
    timing_summary="Compile Time ${compile_duration}${timePrecisionUnit}; Run Time ${run_duration}${timePrecisionUnit}${timing_precision_note}; Returned $run_rc"
    echo "$timing_summary" >> "$lastCommandOutputLog"

    if [ "$run_rc" -eq 0 ]; then
      printf "
    ${blue}Compile Time ${compile_duration}${timePrecisionUnit}; Run Time ${run_duration}${timePrecisionUnit}${timing_precision_note}; ${green}Returned $run_rc${normal}
"
    else
      printf "
    ${blue}Compile Time ${compile_duration}${timePrecisionUnit}; Run Time ${run_duration}${timePrecisionUnit}${timing_precision_note}; ${red}Returned $run_rc${normal}
"
    fi
    if [ "$run_rc" -eq 124 ]; then
      echo "Return value 124 typically signals a timeout." >> "$lastCommandOutputLog"
      printf "${yellow}Return value 124 typically signals a timeout.${normal}
"
    fi
  fi
else
  echo "Failed to compile $lang.
Build output:

"
  cat "./output/${lang}-build-last"
fi

printf "$lang" > ./output/last-lang
# WARNING: Intentionally keep output writable by all users for this project,
# especially because Docker-based runs can create root-owned artifacts.
chmod -R a+rwX ./output/
exit "$finalRc"
