#! /bin/sh

# First argument must either be a supported filename or
# "clean". If "clean", the output directory is destroyed
# and the script exits. Otherwise, it will continue to try
# to compile the file specified, passing in any other
# arguments to the code as command line arguments

# Print compact examples first so most users can scan quickly.
print_usage_examples() {
  echo "Examples:"
  echo "  $0 main.py"
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
  echo "  --check-only[=native|docker|ssh] Skip compile/run after setup; optionally simulate one route"
  echo "  --compile-only                    Compile only; skip runtime execution"
  echo ""
  echo "Behavior notes:"
  echo "  --check-only skips both compile and run."
  echo "  --check-only=docker or --check-only=ssh simulates that relay path only."
  echo "  --check-only= or --check-only=native uses native simulation."
  echo ""
}

# Print general invocation and argument forwarding behavior.
print_usage_general_section() {
  echo "General behavior:"
  echo "  This is intended to be run from the command line in the directory of the source file."
  echo "  If first parameter is not a recognized option, it is treated as filename."
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
  echo "Usage: $0 [--list-languages|--list-problems|--flag=<lang>|--unflag=<lang>] [--source-profile=<profile-path>] [--check-only[=native|docker|ssh]] [--compile-only] <filename|clean> [args...]"
  echo "       $0 --help"
  echo ""
  print_usage_examples
  echo "Common options:"
  echo "  --help                 Show this compact help and exit"
  echo "  --help-all             Show full help and exit"
  echo "  --help=<topic>         Show one topic (examples, profile, execution, general, clean)"
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
  echo "Usage: $0 [--list-languages|--list-problems|--flag=<lang>|--unflag=<lang>] [--source-profile=<profile-path>] [--check-only[=native|docker|ssh]] [--compile-only] <filename|clean> [args...]"
  echo "       $0 --help"
  echo ""
  echo "Help options:"
  echo "  --help                 Show compact help and exit"
  echo "  --help-all             Show full help and exit"
  echo "  --help=<topic>         Show one topic (examples, profile, execution, general, clean)"
  echo "  --list-languages       Show language presence grid for current directory and exit"
  echo "  --list-problems        Show only missing or flagged languages and exit"
  echo "  --flag=<lang>          Mark <lang> in ./.flag-lang and exit (also: all, none)"
  echo "  --unflag=<lang>        Remove <lang> from ./.flag-lang and exit (also: all, none)"
  echo ""
  print_usage_examples
  print_usage_profile_section
  print_usage_execution_section
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
    general) print_usage_general_section ;;
    clean) print_usage_clean_section ;;
    *)
      echo "Unknown help topic: $1" >&2
      topicSuggestion=$(suggest_help_topic_for_unknown "$1")
      if [ -n "$topicSuggestion" ]; then
        echo "Did you mean: $topicSuggestion" >&2
      fi
      echo "Supported topics: examples, profile, execution, general, clean" >&2
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
--list-languages
--list-langauges
--list-problems
--flag=
--unflag=
--source-profile=
--check-only
--check-only=
--compile-only
--help
-h
--help-all
--help=
EOF
}

# Shared language key list used by list/flag helpers.
get_supported_language_keys() {
  cat <<'EOF'
ada
arm64asm
asm
ballerina
c
clojure
cobol
cpp
csharp
d
dart
eiffel
elixir
erlang
factor
forth
fortran
freebasic
fsharp
gleam
go
haskell
haxe
icon
idris
java
javascript
julia
kit
kotlin
llvmir
lua
mercury
mmixal
modula3
mojo
nasm
nim
oberon
objectivec
ocaml
octave
pascal
perl
php
prolog
python
r
racket
ruby
rust
scala
scheme
simula
smalltalk
swift
tcl
typescript
v
visualbasic
wat
zig
EOF
}

# Return 0 when one language key is supported.
is_supported_language_key() {
  targetLang="$1"
  for langKey in $(get_supported_language_keys); do
    if [ "$langKey" = "$targetLang" ]; then
      return 0
    fi
  done
  return 1
}

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

# Return terminal width with a conservative fallback.
get_display_columns() {
  displayCols=""
  if command -v tput > /dev/null 2>&1; then
    displayCols=$(tput cols 2>/dev/null)
  fi
  if [ -z "$displayCols" ] && [ -n "$COLUMNS" ]; then
    displayCols="$COLUMNS"
  fi
  case "$displayCols" in
    ''|*[!0-9]*) displayCols=80 ;;
  esac
  if [ "$displayCols" -lt 40 ]; then
    displayCols=40
  fi
  printf '%s\n' "$displayCols"
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
  case "$1" in
    ada) dir_has_extension "adb" ;;
    arm64asm) dir_has_extension "s" ;;
    asm) dir_has_extension "asm" ;;
    ballerina) dir_has_extension "bal" ;;
    c) dir_has_extension "c" ;;
    clojure) dir_has_extension "clj" ;;
    cobol) dir_has_extension "cob" ;;
    cpp) dir_has_extension "cpp" ;;
    csharp) dir_has_extension "cs" ;;
    d) dir_has_extension "d" ;;
    dart) dir_has_extension "dart" ;;
    eiffel) dir_has_extension "e" ;;
    elixir) dir_has_extension "exs" ;;
    erlang) dir_has_extension "erl" ;;
    factor) dir_has_extension "factor" ;;
    forth) dir_has_extension "fth" ;;
    fortran) dir_has_extension "f90" ;;
    freebasic) dir_has_extension "bas" ;;
    fsharp) dir_has_extension "fs" ;;
    gleam) dir_has_extension "gleam" ;;
    go) dir_has_extension "go" ;;
    haskell) dir_has_extension "hs" ;;
    haxe) dir_has_extension "hx" ;;
    icon) dir_has_extension "icn" ;;
    idris) dir_has_extension "idr" ;;
    java) dir_has_extension "java" ;;
    javascript) dir_has_extension "js" ;;
    julia) dir_has_extension "jl" ;;
    kit) dir_has_extension "kit" ;;
    kotlin) dir_has_extension "kt" ;;
    llvmir) dir_has_extension "ll" ;;
    lua) dir_has_extension "lua" ;;
    mercury) dir_has_extension "moo" ;;
    mmixal) dir_has_extension "mms" ;;
    modula3) dir_has_extension "m3" ;;
    mojo) dir_has_extension "mojo" ;;
    nasm) dir_has_extension "nasm" ;;
    nim) dir_has_extension "nim" ;;
    oberon) dir_has_extension "Mod" ;;
    objectivec) dir_has_extension "m" ;;
    ocaml) dir_has_extension "ml" ;;
    octave) dir_has_extension "mat" ;;
    pascal) dir_has_extension "pas" ;;
    perl) dir_has_extension "plx" ;;
    php) dir_has_extension "php" ;;
    prolog) dir_has_extension "pl" ;;
    python) dir_has_extension "py" ;;
    r) dir_has_extension "r" ;;
    racket) dir_has_extension "rkt" ;;
    ruby) dir_has_extension "rb" ;;
    rust) dir_has_extension "rs" ;;
    scala) dir_has_extension "scala" ;;
    scheme) dir_has_extension "scm" ;;
    simula) dir_has_extension "sim" ;;
    smalltalk) dir_has_extension "st" ;;
    swift) dir_has_extension "swift" ;;
    tcl) dir_has_extension "tcl" ;;
    typescript) dir_has_extension "ts" ;;
    v) dir_has_extension "v" ;;
    visualbasic) dir_has_extension "vb" ;;
    wat) dir_has_extension "wat" ;;
    zig) dir_has_extension "zig" ;;
    *) return 1 ;;
  esac
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
    langPresent=0
    langFlagged=0
    if language_has_source_in_cwd "$langName"; then
      langPresent=1
    fi
    if is_language_flagged "$langName"; then
      langFlagged=1
    fi
    if [ "$gridMode" = "problems" ] && [ "$langPresent" -eq 1 ] && [ "$langFlagged" -eq 0 ]; then
      continue
    fi

    langLen=${#langName}
    if [ "$langFlagged" -eq 1 ]; then
      langLen=$((langLen + 1))
    fi
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
    langPresent=0
    langFlagged=0
    if language_has_source_in_cwd "$langName"; then
      langPresent=1
      langColor="$gridGreen"
    else
      langColor="$gridYellow"
    fi
    if is_language_flagged "$langName"; then
      langFlagged=1
    fi
    if [ "$gridMode" = "problems" ] && [ "$langPresent" -eq 1 ] && [ "$langFlagged" -eq 0 ]; then
      continue
    fi

    if [ "$langFlagged" -eq 1 ]; then
      padWidth=$((colWidth - ${#langName} - 1))
      if [ "$padWidth" -lt 0 ]; then
        padWidth=0
      fi
      printf "  %b%s%b%bF%b%*s" "$langColor" "$langName" "$gridNormal" "$gridRed" "$gridNormal" "$padWidth" ""
    else
      padWidth=$((colWidth - ${#langName}))
      if [ "$padWidth" -lt 0 ]; then
        padWidth=0
      fi
      printf "  %b%s%b%*s" "$langColor" "$langName" "$gridNormal" "$padWidth" ""
    fi

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

# Print supported help topics for did-you-mean matching.
print_help_topic_catalog() {
  cat <<'EOF'
examples
profile
execution
general
clean
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

sourceProfileOverrideSet=0
sourceProfileOverridePath=
checkOnlyMode=0
checkOnlyRoute="native"
compileOnlyMode=0

quickMode=""
quickModeValue=""
quickModeIgnoredArgs=""

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

if [ -n "$quickMode" ]; then
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
fi

while [ $# -ge 1 ]; do
  case "$1" in
    --source-profile=*)
      sourceProfileOverrideSet=1
      sourceProfileOverridePath=${1#--source-profile=}
      shift 1
      ;;
    --check-only)
      checkOnlyMode=1
      checkOnlyRoute="native"
      shift 1
      ;;
    --check-only=*)
      checkOnlyMode=1
      checkOnlyRoute=${1#--check-only=}
      if [ -z "$checkOnlyRoute" ]; then
        checkOnlyRoute="native"
      fi
      shift 1
      ;;
    --compile-only)
      compileOnlyMode=1
      shift 1
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

fileName=$1
fileNameWithoutExt="${fileName%.*}"
fileExtension="${fileName##*.}"
className=$(echo "$fileNameWithoutExt" | tr '[:lower:]' '[:upper:]')
shift 1
currentCpuArch=$(uname -m)
currentPlatform=$(uname -s)
startDir=$PWD
dir="${PWD%/*}"
packName="${dir##*/}"
algoName="${PWD##*/}"
moduleName="$(echo "$fileNameWithoutExt" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
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
  case "$currentPlatform" in
    "MINGW64_NT"*) . ~/.bash_profile >> "$profileOutCache" 2>&1 ;;
    "Linux"*) . ~/.bash_profile >> "$profileOutCache" 2>&1 ;;
    "FreeBSD") . ~/.profile >> "$profileOutCache" 2>&1 ;;
    "Darwin") . ~/.zprofile >> "$profileOutCache" 2>&1 ;;
    *) ;;
  esac
fi

if [ -n "$DEREKALGOS_TIMEOUT" ]; then
  timeoutConfig="$DEREKALGOS_TIMEOUT"
  timeoutFromHost=1
fi
if [ -z "$timeoutConfig" ]; then
  timeoutConfig="-k 10s 2m"
fi
export DEREKALGOS_TIMEOUT="$timeoutConfig"

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
detect_time_precision

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

# Parse SSH route values in either legacy or explicit form:
#   legacy:   ssh-destination|code-dir|run-script
#   explicit: ssh-address|ssh-user|ssh-port|code-dir|run-script
parse_ssh_route_definition() {
  ssh_target_def="$1"

  ssh_destination=
  ssh_address=
  ssh_user=
  ssh_port=
  ssh_codedir=
  ssh_runscript=

  if [ -z "$ssh_target_def" ]; then
    return 1
  fi

  ssh_field_count=$(printf '%s' "$ssh_target_def" | awk -F'|' '{print NF}')
  case "$ssh_field_count" in
    3)
      ssh_destination=${ssh_target_def%%|*}
      ssh_target_rest=${ssh_target_def#*|}
      ssh_codedir=${ssh_target_rest%%|*}
      ssh_runscript=${ssh_target_rest#*|}
      if [ -z "$ssh_destination" ] || [ -z "$ssh_codedir" ] || [ -z "$ssh_runscript" ]; then
        return 1
      fi
      ;;
    5)
      ssh_address=${ssh_target_def%%|*}
      ssh_target_rest=${ssh_target_def#*|}
      ssh_user=${ssh_target_rest%%|*}
      ssh_target_rest=${ssh_target_rest#*|}
      ssh_port=${ssh_target_rest%%|*}
      ssh_target_rest=${ssh_target_rest#*|}
      ssh_codedir=${ssh_target_rest%%|*}
      ssh_runscript=${ssh_target_rest#*|}

      if [ -z "$ssh_address" ] || [ -z "$ssh_user" ] || [ -z "$ssh_port" ] || [ -z "$ssh_codedir" ] || [ -z "$ssh_runscript" ]; then
        return 1
      fi
      case "$ssh_port" in
        *[!0-9]*|'') return 1 ;;
      esac
      ssh_destination="$ssh_user@$ssh_address"
      ;;
    *)
      return 1
      ;;
  esac

  return 0
}

# Quote one argument so it is safe in POSIX sh commands.
shell_quote() {
  # Return a single shell token safe for POSIX sh parsing.
  quoted=$(printf '%s' "$1" | sed "s/'/'\\\\''/g")
  printf "'%s'" "$quoted"
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

repoRootPath=$(resolve_abs_path "$startDir/../../../")
startDirFromRepo=
case "$startDir" in
  "$repoRootPath") startDirFromRepo="" ;;
  "$repoRootPath"/*) startDirFromRepo=${startDir#"$repoRootPath"/} ;;
  *) startDirFromRepo="" ;;
esac


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
  archiveListFile=$(make_tmp_file "source-archive") || return 1
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

# Run a command, stream its output, and append output to logs.
run_and_log_output() {
  relay_log_file="$1"
  shift
  (
    relay_tmp_file=$(make_tmp_file "relay") || {
      echo "ERROR: unable to create relay temp file" >&2
      exit 1
    }

    trap 'rm -f "$relay_tmp_file"' INT TERM HUP EXIT

    "$@" > "$relay_tmp_file" 2>&1
    relay_ret="$?"

    flush_output_to_logs "$relay_tmp_file" "$relay_log_file" "relay output"

    exit "$relay_ret"
  )
  return "$?"
}

# Create a temp file path with a predictable derekalgos prefix.
make_tmp_file() {
  tmp_label="$1"
  max_tmp_tries=128
  if command -v mktemp > /dev/null 2>&1; then
    mktemp "${TMPDIR:-/tmp}/derekalgos-${tmp_label}.XXXXXX"
  else
    tmp_idx=0
    while [ "$tmp_idx" -lt "$max_tmp_tries" ]; do
      tmp_file="${TMPDIR:-/tmp}/derekalgos-${tmp_label}.$$.$tmp_idx"
      ( set -C; : > "$tmp_file" ) 2>/dev/null && { printf '%s\n' "$tmp_file"; return 0; }
      tmp_idx=$((tmp_idx + 1))
    done
    echo "ERROR: unable to create temp file in ${TMPDIR:-/tmp} after $max_tmp_tries attempts" >&2
    return 1
  fi
}

# Print captured output and append it to main and shared logs.
flush_output_to_logs() {
  flush_tmp_file="$1"
  flush_log_file="$2"
  flush_label="$3"

  cat "$flush_tmp_file"
  cat "$flush_tmp_file" >> "$flush_log_file"
  flush_append_ret="$?"
  if [ "$flush_append_ret" -ne 0 ]; then
    echo "WARNING: failed to append $flush_label to $flush_log_file (returned $flush_append_ret)" >&2
  fi

  if [ -z "$RUN_AND_LOG_SKIP_SHARED_APPEND" ] && [ -n "$lastCommandOutputLog" ] && [ "$flush_log_file" != "$lastCommandOutputLog" ]; then
    cat "$flush_tmp_file" >> "$lastCommandOutputLog"
    flush_last_ret="$?"
    if [ "$flush_last_ret" -ne 0 ]; then
      echo "WARNING: failed to append $flush_label to $lastCommandOutputLog (returned $flush_last_ret)" >&2
    fi
  fi
}

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
    _tmp=$(make_tmp_file "relay") || {
      echo "ERROR: unable to create run output temp file" >&2
      exit 1
    }
    _flag=$(make_tmp_file "timeout") || {
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

# Color variables
red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
blue='\033[0;34m'
normal='\033[0m' # Resets the color to default

# The first section, each language that we support needs to have
# a lang_compile and lang_run. This will be called when a file of
# that code type is recognized according to file extension below
# The compile phase can reasonably do nothing for scripts and similar.
# Any build output should go to ./output/lang-build-last
# as this will be output when recognized that the build failed

# =============================================
#           ADA
# =============================================
ada_compile() {
  echo "gnatmake -v -D output -o \"./output/$fileNameWithoutExt\" \"$fileName\"" > ./output/ada-build-last
  gnatmake -v -D output -o "./output/$fileNameWithoutExt" "$fileName" >> ./output/ada-build-last  2>&1
  retValue="$?"
  echo "-- GNAT returned: $retValue" >> ./output/ada-build-last
  return "$retValue"
}
ada_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
ada_archive() {
  default_lang_archive "$@"
}

# =============================================
#           ASSEMBLY (ARM64)
# =============================================
arm64asm_compile() {
  do_link=0
  platform="$currentPlatform"
  platform_output=
  case "$platform" in
    "Darwin"*)
      platform="Darwin"
      platform_output="darwin"
    ;;
    *)
      echo "Unrecognized Platform for Assembly Builds" > ./output/arm64asm-build-last
      return 1
  esac
  case "$currentCpuArch" in
    "arm64")
      platform="${platform}-arm64"
      platform_output="${platform_output}arm64"
      ;;
    *)
      echo "Unrecognized CPU Architecture for Assembly Builds" > ./output/arm64asm-build-last
      return 1
      ;;
  esac

  # First go into stdlib and build the standard library ;)
  #   Only build if there's new changes to be built
  echo "Building Assembly..." > ./output/arm64asm-build-last
  echo "Building Assembly Standard Library..." >> ./output/arm64asm-build-last
  cp "./$fileName" ./output/
  cd ../../../stdlib || { echo "Failed to cd into stdlib for arm64asm build" >> "$startDir/output/arm64asm-build-last"; return 1; }
  ./build.sh "$platform" >> "$startDir/output/arm64asm-build-last" 2>&1
  retValue="$?"
  cd "$startDir" || { echo "Failed to return to start directory: $startDir" >> "$startDir/output/arm64asm-build-last"; return 1; }
  if [ $retValue -ne 0 ]; then
    return $retValue
  fi
  cat "../../../stdlib/output/${platform_output}-build-last" >> ./output/arm64asm-build-last
  arm64_log_merge_ret="$?"
  if [ "$arm64_log_merge_ret" -ne 0 ]; then
    echo "WARNING: failed to append stdlib build log to ./output/arm64asm-build-last (returned $arm64_log_merge_ret)" >&2
  fi
  stdlib="../../../stdlib/output/stdlib-${platform}.o"

  # Now we build our actual output, linking to the standard library
  #   Only build if there's new changes to be built
  echo "Building Assembly file..." >> ./output/arm64asm-build-last
  do_build=0
  if [ ! -f "./output/$fileNameWithoutExt.o" ]; then
    do_build=1
  elif [ -n "$(find "$fileName" -prune -newer "./output/$fileNameWithoutExt.o" 2>/dev/null)" ]; then
    do_build=1
  fi
  if [ "$do_build" -eq 1 ]; then
    echo "as -v -arch arm64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/arm64asm-build-last
    as -v -arch arm64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/arm64asm-build-last 2>&1
    retValue="$?"
        
    echo "-- as returned: $retValue" >> ./output/arm64asm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
    do_link=1
  fi
  if [ ! -f "./output/$fileNameWithoutExt" ]; then
    do_link=1
  elif [ -n "$(find "$stdlib" -prune -newer "./output/$fileNameWithoutExt" 2>/dev/null)" ]; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    echo "ld -v -e _start -arch arm64 -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\" -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path)" >> ./output/arm64asm-build-last
    ld -v -e _start -arch arm64 -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path) >> ./output/arm64asm-build-last 2>&1
    retValue="$?"
    echo "-- ld returned: $retValue" >> ./output/arm64asm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
  fi
  return "$retValue"
}
arm64asm_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
arm64asm_archive() {
  default_lang_archive "$1"
  # Archive prebuilt stdlib bundle for this target, or include missing marker.
  arm64asmTag="Darwin-arm64"
  case "$currentPlatform" in
    "Darwin"*) arm64asmTag="Darwin-arm64" ;;
    *) arm64asmTag="" ;;
  esac
  if [ -n "$arm64asmTag" ]; then
    add_stdlib_prebuilt_archive_or_marker "$1" "$arm64asmTag"
  fi
}

# =============================================
#           ASSEMBLY (AT&T/GAS - x86-64)
# =============================================
asm_compile() {
  do_link=0
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
      echo "Unrecognized Platform for Assembly Builds" > ./output/asm-build-last
      return 1
    ;;
  esac
  case "$currentCpuArch" in
    "x86_64")
      platform="${platform}-x64"
      platform_output="${platform_output}x64"
      ;;
    "amd64")
      platform="${platform}-x64"
      platform_output="${platform_output}x64"
      ;;
    *)
      echo "Unrecognized CPU Architecture for Assembly Builds" > ./output/asm-build-last
      return 1
      ;;
  esac

  # First go into stdlib and build the standard library ;)
  #   Only build if there's new changes to be built
  echo "Building Assembly..." > ./output/asm-build-last
  echo "Building Assembly Standard Library..." >> ./output/asm-build-last
  cp "./$fileName" ./output/
  cd ../../../stdlib || { echo "Failed to cd into stdlib for asm build" >> "$startDir/output/asm-build-last"; return 1; }
  ./build.sh "$platform" >> "$startDir/output/asm-build-last" 2>&1
  retValue="$?"
  cd "$startDir" || { echo "Failed to return to start directory: $startDir" >> "$startDir/output/asm-build-last"; return 1; }
  if [ $retValue -ne 0 ]; then
    return $retValue
  fi
  cat "../../../stdlib/output/${platform_output}-build-last" >> ./output/asm-build-last
  asm_log_merge_ret="$?"
  if [ "$asm_log_merge_ret" -ne 0 ]; then
    echo "WARNING: failed to append stdlib build log to ./output/asm-build-last (returned $asm_log_merge_ret)" >&2
  fi
  stdlib="../../../stdlib/output/stdlib-${platform}.o"

  # Now we build our actual output, linking to the standard library
  #   Only build if there's new changes to be built
  echo "Building Assembly file..." >> ./output/asm-build-last
  do_build=0
  if [ ! -f "./output/$fileNameWithoutExt.o" ]; then
    do_build=1
  elif [ -n "$(find "$fileName" -prune -newer "./output/$fileNameWithoutExt.o" 2>/dev/null)" ]; then
    do_build=1
  fi
  if [ "$do_build" -eq 1 ]; then
    case "$platform" in
      "Windows-x64")
        echo "as -v --defsym WINDOWS=1 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/asm-build-last
        as -v --defsym WINDOWS=1 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "as -v --defsym WINDOWS=0 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/asm-build-last
        as -v --defsym WINDOWS=0 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
    esac
    echo "-- as returned: $retValue" >> ./output/asm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
    do_link=1
  fi
  if [ ! -f "./output/$fileNameWithoutExt" ]; then
    do_link=1
  elif [ -n "$(find "$stdlib" -prune -newer "./output/$fileNameWithoutExt" 2>/dev/null)" ]; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    case "$platform" in
      "Windows-x64")
        echo "ld -v -e _start -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\" -L \"$LD_ADDITIONAL_DIRECTORY\" -lkernel32 -lshell32" >> ./output/asm-build-last
        ld -v -e _start -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" -L "$LD_ADDITIONAL_DIRECTORY" -lkernel32 -lshell32 >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "ld -v -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\"" >> ./output/asm-build-last
        ld -v -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
    esac
    echo "-- ld returned: $retValue" >> ./output/asm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
  fi
  return "$retValue"
}
asm_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
asm_archive() {
  default_lang_archive "$1"
  asmArchivePlatformTag=
  case "$currentPlatform" in
    "Linux"*) asmArchivePlatformTag="Linux" ;;
    "FreeBSD"*) asmArchivePlatformTag="FreeBSD" ;;
    "MINGW64_NT"*) asmArchivePlatformTag="Windows" ;;
    *) asmArchivePlatformTag= ;;
  esac
  asmArchiveArchTag=
  case "$currentCpuArch" in
    "x86_64"|"amd64") asmArchiveArchTag="x64" ;;
    *) asmArchiveArchTag= ;;
  esac
  if [ -n "$asmArchivePlatformTag" ] && [ -n "$asmArchiveArchTag" ]; then
    tag="${asmArchivePlatformTag}-${asmArchiveArchTag}"
    add_stdlib_prebuilt_archive_or_marker "$1" "$tag"
  fi
}

# =============================================
#           Ballerina
# =============================================
ballerina_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "bal build -v \"$fileName\"" > ./ballerina-build-last
  bal build -v "$fileName" >> ./ballerina-build-last  2>&1
  retValue="$?"
  echo "-- bal returned: $retValue" >> ./ballerina-build-last

  cd ..
  return "$retValue"
}
ballerina_run() {
  java -jar "./output/$fileNameWithoutExt.jar" "$@"
  return "$?"
}
ballerina_archive() {
  default_lang_archive "$@"
}

# =============================================
#           C
# =============================================
c_compile() {
  echo "gcc -v -Wall -Wextra \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/c-build-last
  gcc -v -Wall -Wextra "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/c-build-last 2>&1
  retValue="$?"
  echo "-- GCC returned: $retValue" >> ./output/c-build-last
  return "$retValue"
}
c_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
c_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Clojure
# =============================================
clojure_compile() {
  retValue=0
  mkdir -p ./output/src/algo ./output/resources
  do_update_source=0
  if [ ! -f "./output/src/algo/main.clj" ]; then
    do_update_source=1
  elif [ -n "$(find "./$fileName" -prune -newer "./output/src/algo/main.clj" 2>/dev/null)" ]; then
    do_update_source=1
  fi
  if [ "$do_update_source" -eq 1 ]; then
    printf '(ns algo.main (:gen-class))\n(defn -main [& args]\n  (binding [*command-line-args* (into ["%s"] args)]\n    (load-string (slurp (clojure.java.io/resource "%s")))))\n' "./$fileName" "$fileName" > "./output/src/algo/main.clj"
    cp "./$fileName" ./output/resources/
  fi

  if [ ! -f "./output/project.clj" ]; then
    template_content=$(cat ../../../templates/template.project.clj)
    get_variabled_string "$template_content" > "./output/project.clj"
  fi

  do_lein_uberjar=0
  if [ ! -f "./output/target/uberjar/$fileNameWithoutExt-1.0.0-standalone.jar" ]; then
    do_lein_uberjar=1
  elif [ -n "$(find "./$fileName" -prune -newer "./output/target/uberjar/$fileNameWithoutExt-1.0.0-standalone.jar" 2>/dev/null)" ]; then
    do_lein_uberjar=1
  fi
  if [ "$do_lein_uberjar" -eq 1 ]; then
    cd ./output
    echo "LEIN_VERBOSE=true lein uberjar" > ./clojure-build-last
    LEIN_VERBOSE=true lein uberjar >> ./clojure-build-last 2>&1
    retValue="$?"
    echo "-- lein returned: $retValue" >> ./clojure-build-last
    cd ..
  fi
  return "$retValue"
}
clojure_run() {
  java -cp "./output/target/uberjar/$fileNameWithoutExt-1.0.0-standalone.jar" clojure.main -m algo.main "$@"
  return "$?"
}
clojure_archive() {
  default_lang_archive "$@"
}

# =============================================
#           COBOL
# =============================================
cobol_compile() {
  echo "cobc -v -x -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/cobol-build-last
  cobc -v -x -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/cobol-build-last 2>&1
  retValue="$?"
  echo "-- cobc returned: $retValue" >> ./output/cobol-build-last
  return "$retValue"
}
cobol_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
cobol_archive() {
  default_lang_archive "$@"
}

# =============================================
#           C++
# =============================================
cpp_compile() {
  echo "g++ -v -Wall -Wextra \"./$fileName\" -o \"./output/$fileNameWithoutExt\" --std=c++23 -lstdc++exp" > ./output/cpp-build-last
  g++ -v -Wall -Wextra "./$fileName" -o "./output/$fileNameWithoutExt" --std=c++23 -lstdc++exp >> ./output/cpp-build-last 2>&1
  retValue="$?"
  echo "-- G++ returned: $retValue" >> ./output/cpp-build-last
  return "$retValue"
}
cpp_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

cpp_archive() {
  default_lang_archive "$@"
}

# =============================================
#           C#
# =============================================
csharp_compile() {
  if [ ! -f "./output/$fileName" ]; then
    cp "./$fileName" ./output/
  elif [ -n "$(find "./$fileName" -prune -newer "./output/$fileName" 2>/dev/null)" ]; then
    cp "./$fileName" ./output/
  fi
  cd ./output

  if [ ! -f "$fileNameWithoutExt.csproj" ]; then
    template_content=$(cat ../../../../templates/template.csproj)
    get_variabled_string "$template_content" > "$fileNameWithoutExt.csproj"
  fi

  echo "cd ./output" > ./csharp-build-last
  echo "echo [$fileNameWithoutExt.csproj]" >> ./csharp-build-last
  echo "dotnet build --verbosity:detailed" >> ./csharp-build-last
  echo "cd .." >> ./csharp-build-last
  dotnet build --verbosity:detailed >> ./csharp-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./csharp-build-last
  cd ..
  return "$retValue"
}
csharp_run() {
  "./output/bin/Debug/net10.0/$fileNameWithoutExt" "$@"
  return "$?"
}
csharp_archive() {
  default_lang_archive "$@"
}

# =============================================
#           D
# =============================================
d_compile() {
  echo "dmd -v -od=./output -of=\"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/d-build-last
  dmd -v -od=./output -of="./output/$fileNameWithoutExt" "./$fileName" >> ./output/d-build-last 2>&1
  retValue="$?"
  echo "-- dmd returned: $retValue" >> ./output/d-build-last
  return "$retValue"
}
d_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
d_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Dart
# =============================================
dart_compile() {
  echo "dart --verbose compile exe \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/dart-build-last
  dart --verbose compile exe "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/dart-build-last 2>&1
  retValue="$?"
  echo "-- dart returned: $retValue" >> ./output/dart-build-last
  return "$retValue"
}
dart_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
dart_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Eiffel
# =============================================
eiffel_compile() {
  retValue=0
  eiffel_compiler=$(printf '%s' "$DEREKALGOS_EIFFEL" | tr '[:upper:]' '[:lower:]')
  case "$eiffel_compiler" in
  "eiffelstudio")
    #WARNING: This new_uuid is currently evaluated via eval. We should
    # address this better in the future.
    new_uuid=$(uuidgen)

    cp "./$fileName" ./output/
    cp ./eiffel_include/*.e ./output/ >> /dev/null 2>&1
    cd ./output/

    if [ ! -f "$fileNameWithoutExt.ecf" ]; then
      template_content=$(cat ../../../../templates/eiffel.ecf)
      get_variabled_string "$template_content" > "./$fileNameWithoutExt.ecf"
    fi

    echo "ec -batch -verbose -config \"./$fileNameWithoutExt.ecf\" -finalize" > ./eiffel-build-last
    ec -batch -verbose -config "./$fileNameWithoutExt.ecf" -finalize >> ./eiffel-build-last 2>&1
    retValue="$?"
    echo "-- ec returned: $retValue" >> ./eiffel-build-last
    cd ..
    if [ "$retValue" -ne 0 ]; then
     return $retValue
    fi

    cd "./output/EIFGENs/$fileNameWithoutExt/F_code"
    echo "

===========================================================================
FIRST COMPILE FINISHED. CALLING finish_freezing in EIFGENs/$fileNameWithoutExt/F_code
===========================================================================

" >> "../../../eiffel-build-last"
    finish_freezing >> "../../../eiffel-build-last"
    retValue="$?"
    echo "-- finish_freezing returned: $retValue" >> ../../../eiffel-build-last

    cd ../../../../
  ;;
  "libertyeiffel")
    cp "./$fileName" ./output/
    cp ./eiffel_include/*.e ./output/ >> /dev/null 2>&1
    mkdir -p "./output/EIFGENs/$fileNameWithoutExt/F_code"
    cd ./output/

    echo "se compile \"$fileName\" -o \"./$fileNameWithoutExt\"" > ./eiffel-build-last
    se compile "$fileName" -o "EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt" >> ./eiffel-build-last 2>&1
    retValue="$?"
    echo "-- se compile returned: $retValue" >> ./eiffel-build-last

    cd ..
  ;;
  *)
    mkdir -p ./output
    echo "Unsupported DEREKALGOS_EIFFEL value: $DEREKALGOS_EIFFEL" > ./output/eiffel-build-last
    echo "Accepted values (case-insensitive): eiffelstudio, libertyeiffel" >> ./output/eiffel-build-last
    retValue=64
  ;;
  esac
  return "$retValue"
}
eiffel_run() {
  "./output/EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt" "$@"
  return "$?"
}
eiffel_archive() {
  default_lang_archive "$@"

  for eiffelIncludeFile in "$startDir"/eiffel_include/*.e; do
    [ -f "$eiffelIncludeFile" ] || continue
    eiffelIncludeBase=$(basename "$eiffelIncludeFile")
    if [ -n "$startDirFromRepo" ]; then
      add_archive_input_if_exists "$1" "$startDirFromRepo/eiffel_include/$eiffelIncludeBase"
    else
      add_archive_input_if_exists "$1" "eiffel_include/$eiffelIncludeBase"
    fi
  done
}

# =============================================
#           Elixir
# =============================================
elixir_compile() {
  echo "elixirc --verbose -o ./output/ \"./$fileName\"" > ./output/elixir-build-last
  elixirc --verbose -o ./output/ "./$fileName" >> ./output/elixir-build-last 2>&1
  retValue="$?"
  echo "-- elixirc returned: $retValue" >> ./output/elixir-build-last
  return "$retValue"
}
elixir_run() {
  elixir --erl "-pa ./output/" -e "$moduleName.main(System.argv())" -- "$@"
  return "$?"
}
elixir_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Erlang
# =============================================
erlang_compile() {
  echo "erlc +verbose +report -o ./output/ \"./$fileName\"" > ./output/erlang-build-last
  erlc +verbose +report -o ./output/ "./$fileName" >> ./output/erlang-build-last 2>&1
  retValue="$?"
  echo "-- erlc returned: $retValue" >> ./output/erlang-build-last
  return "$retValue"
}
erlang_run() {
  cd ./output
  erl -noshell -s "$fileNameWithoutExt" main -s init stop -- "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
erlang_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Factor
# =============================================
factor_compile() {
  return 0
}
factor_run() {
  factor -run "./$fileName" "$@"
  return "$?"
}
factor_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Forth
# =============================================
forth_compile() {
  return 0
}
forth_run() {
  gforth "./$fileName" -- "$@"
  return "$?"
}
forth_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Fortran
# =============================================
fortran_compile() {
  echo "gfortran -v -Wall -Wextra \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/fortran-build-last
  gfortran -v -Wall -Wextra "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/fortran-build-last 2>&1
  retValue="$?"
  echo "-- gfortran returned: $retValue" >> ./output/fortran-build-last
  return "$retValue"
}
fortran_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
fortran_archive() {
  default_lang_archive "$@"
}

# =============================================
#           FreeBASIC
# =============================================
freebasic_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "fbc -v \"./$fileName\"" > ./freebasic-build-last
  fbc -v "./$fileName" >> ./freebasic-build-last  2>&1
  retValue="$?"
  echo "-- fbc returned: $retValue" >> ./freebasic-build-last

  cd ..
  return "$retValue"
}
freebasic_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
freebasic_archive() {
  default_lang_archive "$@"
}

# =============================================
#           FSharp
# =============================================
fsharp_compile() {
  if [ ! -f "./output/$fileName" ]; then
    cp "./$fileName" ./output/
  elif [ -n "$(find "./$fileName" -prune -newer "./output/$fileName" 2>/dev/null)" ]; then
    cp "./$fileName" ./output/
  fi
  cd ./output

  if [ ! -f "$fileNameWithoutExt.fsproj" ]; then
    template_content=$(cat ../../../../templates/template.fsproj)
    get_variabled_string "$template_content" > "$fileNameWithoutExt.fsproj"
  fi

  echo "cd ./output" > ./fsharp-build-last
  echo "echo [$fileNameWithoutExt.fsproj]" >> ./fsharp-build-last
  echo "dotnet build --verbosity:detailed" >> ./fsharp-build-last
  echo "cd .." >> ./fsharp-build-last
  dotnet build --verbosity:detailed >> ./fsharp-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./fsharp-build-last
  cd ..
  return "$retValue"
}
fsharp_run() {
  "./output/bin/Debug/net10.0/$fileNameWithoutExt" "$@"
  return "$?"
}
fsharp_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Gleam
# =============================================
gleam_compile() {
  mkdir -p output/src
  cp "./$fileName" ./output/src/

  if [ ! -f "./output/gleam.toml" ]; then
    template_content=$(cat ../../../templates/gleam-template.toml)
    get_variabled_string "$template_content" > "./output/gleam.toml"
    template_content=$(cat ../../../templates/gleam-manifest.toml)
    get_variabled_string "$template_content" > "./output/manifest.toml"
  fi

  echo "gleam build --verbose \"$fileNameWithoutExt\"" > ./output/gleam-build-last
  cd ./output
  gleam build --verbose >> ./gleam-build-last 2>&1
  retValue="$?"
  echo "-- gleam returned: $retValue" >> ./gleam-build-last
  cd ../
  return "$retValue"
}
gleam_run() {
  cd ./output
  gleam run --no-print-progress -m "$fileNameWithoutExt" -- "$@" 2>> ./gleam-build-last
  retValue="$?"
  cd ..
  return "$retValue"
}
gleam_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Go
# =============================================
go_compile() {
  echo "go build -v -x -work -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/go-build-last
  go build -v -x -work -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/go-build-last 2>&1
  retValue="$?"
  echo "-- go returned: $retValue" >> ./output/go-build-last
  return "$retValue"
}
go_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
go_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Haskell
# =============================================
haskell_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ghc -v2 \"./$fileName\"" > ./haskell-build-last
  ghc -v2 "./$fileName" >> ./haskell-build-last 2>&1
  retValue="$?"
  echo "-- ghc returned: $retValue" >> ./haskell-build-last
  cd ..
  return "$retValue"
}
haskell_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
haskell_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Haxe
# =============================================
haxe_compile() {
  return 0
}
haxe_run() {
  haxe --run "$fileName" "$@"
  return "$?"
}
haxe_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Icon
# =============================================
icon_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "icont -v \"./$fileName\"" > ./icon-build-last
  icont -v "./$fileName" >> ./icon-build-last 2>&1
  retValue="$?"
  echo "-- icont returned: $retValue" >> ./icon-build-last
  cd ..
  return "$retValue"
}
icon_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
icon_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Idris
# =============================================
idris_compile() {
  cp "./$fileName" ./output/
  cd ./output

  echo "idris2 --verbose \"$fileName\" -o \"$fileNameWithoutExt\"" > ./idris-build-last
  idris2 --verbose "$fileName" -o "$fileNameWithoutExt" >> ./idris-build-last 2>&1
  retValue="$?"
  echo "-- idris2 returned: $retValue" >> ./idris-build-last

  cd ..
  return "$retValue"
}
idris_run() {
  "./output/build/exec/$fileNameWithoutExt" "$@"
  return "$?"
}
idris_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Java
# =============================================
java_compile() {
  echo "javac -verbose -Xlint:all \"./$fileName\" -d ./output" > ./output/java-build-last
  javac -verbose -Xlint:all "./$fileName" -d ./output >> ./output/java-build-last 2>&1
  retValue="$?"
  echo "-- javac returned: $retValue" >> ./output/java-build-last
  if [ "$retValue" -ne 0 ]; then
    return $retValue
  fi
  cd ./output
  echo "jar cvfe \"$fileNameWithoutExt.jar\" \"$packName.$algoName.$fileNameWithoutExt\" \"$packName/$algoName/$fileNameWithoutExt.class\"" >> ./java-build-last
  jar cvfe "$fileNameWithoutExt.jar" "$packName.$algoName.$fileNameWithoutExt" "$packName/$algoName/$fileNameWithoutExt.class" >> ./java-build-last 2>&1
  retValue="$?"
  echo "-- jar cvfe returned: $retValue" >> ./java-build-last
  cd ..
  return "$retValue"
}
java_run() {
  cd ./output
  java -jar "$fileNameWithoutExt.jar" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
java_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Javascript
# =============================================
javascript_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "node --check \"./$fileName\"" > ./javascript-build-last
  node --check "./$fileName" >> ./javascript-build-last 2>&1
  retValue="$?"
  echo "-- node returned: $retValue" >> ./javascript-build-last
  cd ..
  return "$retValue"
}
javascript_run() {
  cd ./output
  node "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
javascript_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Julia
# =============================================
julia_compile() {
  return 0
}
julia_run() {
  julia "./$fileName" "$@"
  return "$?"
}
julia_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Kit
# =============================================
kit_compile() {
  return 0
}
kit_run() {
  kit run "./$fileName" "$@"
  return "$?"
}
kit_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Kotlin
# =============================================
kotlin_compile() {
  echo "kotlinc -verbose \"./$fileName\" -include-runtime -d \"./output/$fileNameWithoutExt.jar\"" > ./output/kotlin-build-last
  kotlinc -verbose "./$fileName" -include-runtime -d "./output/$fileNameWithoutExt.jar" >> ./output/kotlin-build-last 2>&1
  retValue="$?"
  echo "-- kotlinc returned: $retValue" >> ./output/kotlin-build-last
  return "$retValue"
}
kotlin_run() {
  java -jar "./output/$fileNameWithoutExt.jar" "$@"
  return "$?"
}
kotlin_archive() {
  default_lang_archive "$@"
}

# =============================================
#           LLVM IR
# =============================================
llvmir_compile() {
  echo "clang -v \"./$fileName\" -O2 -Wall -Wextra -o \"./output/$fileNameWithoutExt\"" > ./output/llvmir-build-last
  clang -v "./$fileName" -O2 -Wall -Wextra -o "./output/$fileNameWithoutExt" >> ./output/llvmir-build-last 2>&1
  retValue="$?"
  echo "-- clang returned: $retValue" >> ./output/llvmir-build-last
  return "$retValue"
}
llvmir_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
llvmir_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Lua
# =============================================
lua_compile() {
  echo "luac -o \"./output/$fileNameWithoutExt.luac\" \"./$fileName\"" > ./output/lua-build-last
  luac -o "./output/$fileNameWithoutExt.luac" "./$fileName" >> ./output/lua-build-last 2>&1
  retValue="$?"
  echo "-- luac returned: $retValue" >> ./output/lua-build-last
  return "$retValue"
}
lua_run() {
  lua "./output/$fileNameWithoutExt.luac" "$@"
  return "$?"
}
lua_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Mercury
# =============================================
mercury_compile() {
  echo "Copying $fileName to output as .m..." > ./output/mercury-build-last
  cp "$fileName" "./output/$fileNameWithoutExt.m"
  cd ./output

  echo "cd ./output" >> ./mercury-build-last
  echo "mmc --verbose \"./$fileNameWithoutExt.m\"" >> ./mercury-build-last
  echo "cd .." >> ./mercury-build-last
  mmc --verbose "./$fileNameWithoutExt.m" >> ./mercury-build-last 2>&1
  retValue="$?"
  echo "-- mmc returned: $retValue" >> ./mercury-build-last

  cd ..
  return "$retValue"
}
mercury_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
mercury_archive() {
  default_lang_archive "$@"
}

# =============================================
#           MMIXAL
# =============================================
mmixal_compile() {
  echo "Building MMIX standard library..." > ./output/mmixal-build-last
  cd ../../../stdlib || { echo "Failed to cd into stdlib for mmixal build" >> "$startDir/output/mmixal-build-last"; return 1; }
  ./build.sh mmix >> "$startDir/output/mmixal-build-last" 2>&1
  retValue="$?"
  cd "$startDir" || { echo "Failed to return to start directory: $startDir" >> "$startDir/output/mmixal-build-last"; return 1; }
  if [ $retValue -ne 0 ]; then
    return $retValue
  fi

  stdlib_mms="../../../stdlib/output/stdlib.mms"
  combined_source="./output/$fileName"
  do_refresh_combined=0

  if [ ! -f "$stdlib_mms" ]; then
    echo "Missing MMIX standard library output: $stdlib_mms" >> ./output/mmixal-build-last
    return 1
  fi

  if [ ! -f "$combined_source" ]; then
    do_refresh_combined=1
    echo "Combined MMIX source missing; creating $combined_source" >> ./output/mmixal-build-last
  elif [ -n "$(find "./$fileName" -prune -newer "$combined_source" 2>/dev/null)" ]; then
    do_refresh_combined=1
    echo "Source file changed; refreshing combined MMIX source" >> ./output/mmixal-build-last
  elif [ -n "$(find "$stdlib_mms" -prune -newer "$combined_source" 2>/dev/null)" ]; then
    do_refresh_combined=1
    echo "MMIX stdlib changed; refreshing combined MMIX source" >> ./output/mmixal-build-last
  else
    echo "Combined MMIX source is up-to-date; reusing $combined_source" >> ./output/mmixal-build-last
  fi

  if [ "$do_refresh_combined" -eq 1 ]; then
    echo "Copying source: cp \"./$fileName\" \"$combined_source\"" >> ./output/mmixal-build-last
    cp "./$fileName" "$combined_source" >> ./output/mmixal-build-last 2>&1
    retValue="$?"
    echo "-- cp returned: $retValue" >> ./output/mmixal-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi

    echo "Combining stdlib: cat \"$stdlib_mms\" >> \"$combined_source\"" >> ./output/mmixal-build-last
    cat "$stdlib_mms" >> "$combined_source" 2>> ./output/mmixal-build-last
    retValue="$?"
    echo "-- cat returned: $retValue" >> ./output/mmixal-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
  fi

  if [ ! -s "$combined_source" ]; then
    echo "Combined MMIX source missing or empty: $combined_source" >> ./output/mmixal-build-last
    return 1
  fi

  cd ./output
  echo "cd ./output" >> ./mmixal-build-last
  echo "mmixal \"./$fileName\"" >> ./mmixal-build-last
  echo "cd .." >> ./mmixal-build-last
  mmixal "./$fileName" >> ./mmixal-build-last 2>&1
  retValue="$?"
  echo "-- mmixal returned: $retValue" >> ./mmixal-build-last
  cd ..
  return "$retValue"
}
mmixal_run() {
  cd ./output
  mmix "./$fileNameWithoutExt.mmo" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
mmixal_archive() {
  default_lang_archive "$1"
  # Archive prebuilt stdlib bundle for MMIXAL, or include missing marker.
  add_stdlib_prebuilt_archive_or_marker "$1" "mmix"
}

# =============================================
#           Modula-3
# =============================================
modula3_compile() {
  echo "Making and emptying output/AMD64_LINUX..." > ./output/modula3-build-last
  mkdir -p ./output/AMD64_LINUX
  rm -Rf ./output/AMD64_LINUX/* >> /dev/null
  echo "Copying file to output/AMD64_LINUX..." >> ./output/modula3-build-last
  cp "$fileName" "./output/AMD64_LINUX/$fileName"
  echo "cd ./output" >> ./output/modula3-build-last
  echo "cm3 -verbose \"$fileName\"" >> ./output/modula3-build-last
  cd ./output/
  cm3 -verbose "$fileName" >> ./modula3-build-last 2>&1
  retValue="$?"
  echo "-- cm3 returned: $retValue" >> ./modula3-build-last
  cd ..
  return "$retValue"
}
modula3_run() {
  "./output/AMD64_LINUX/prog" "$@"
  return "$?"
}
modula3_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Mojo
# =============================================
mojo_compile() {
  retValue=0
  if [ ! -f "./output/pixi.toml" ]; then
    template_content=$(cat ../../../templates/pixi.lock)
    get_variabled_string "$template_content" > "./output/pixi.lock"
    template_content=$(cat ../../../templates/pixi.toml)
    get_variabled_string "$template_content" > "./output/pixi.toml"

    echo "Attempting to ensure mojo is added..." > ./output/mojo-build-last
    cd ./output
    pixi add mojo >> ./mojo-build-last 2>&1
    retValue="$?"
    echo "-- pixi returned: $retValue" >> ./mojo-build-last
    cd ..
  else
    echo "pixi.toml exists in output, skipping setup..." > ./output/mojo-build-last
  fi

  cp -f "./$fileName" ./output/
  retValue="$?"
  return "$retValue"
}
mojo_run() {
  cd ./output
  pixi run mojo run "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
mojo_archive() {
  default_lang_archive "$@"
}

# =============================================
#           NASM
# =============================================
nasm_compile() {
  do_link=0
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
      echo "Unrecognized Platform for NASM Builds" > ./output/nasm-build-last
      return 1
    ;;
  esac
  case "$currentCpuArch" in
    "x86_64")
      platform="${platform}-x64-nasm"
      platform_output="${platform_output}x64nasm"
      ;;
    "amd64")
      platform="${platform}-x64-nasm"
      platform_output="${platform_output}x64nasm"
      ;;
    *)
      echo "Unrecognized CPU Architecture for NASM Builds" > ./output/nasm-build-last
      return 1
      ;;
  esac

  # First go into stdlib and build the standard library ;)
  #   Only build if there's new changes to be built
  echo "Building NASM..." > ./output/nasm-build-last
  echo "Building NASM Standard Library..." >> ./output/nasm-build-last
  cp "./$fileName" ./output/
  cd ../../../stdlib || { echo "Failed to cd into stdlib for nasm build" >> "$startDir/output/nasm-build-last"; return 1; }
  ./build.sh "$platform" >> "$startDir/output/nasm-build-last" 2>&1
  retValue="$?"
  cd "$startDir" || { echo "Failed to return to start directory: $startDir" >> "$startDir/output/nasm-build-last"; return 1; }
  if [ $retValue -ne 0 ]; then
    return $retValue
  fi
  cat "../../../stdlib/output/${platform_output}-build-last" >> ./output/nasm-build-last
  nasm_log_merge_ret="$?"
  if [ "$nasm_log_merge_ret" -ne 0 ]; then
    echo "WARNING: failed to append stdlib build log to ./output/nasm-build-last (returned $nasm_log_merge_ret)" >&2
  fi
  stdlib="../../../stdlib/output/stdlib-${platform}.o"

  # Now we build our actual output, linking to the standard library
  #   Only build if there's new changes to be built
  echo "Building NASM file..." >> ./output/nasm-build-last
  do_build=0
  if [ ! -f "./output/$fileNameWithoutExt.o" ]; then
    do_build=1
  elif [ -n "$(find "$fileName" -prune -newer "./output/$fileNameWithoutExt.o" 2>/dev/null)" ]; then
    do_build=1
  fi
  if [ "$do_build" -eq 1 ]; then
    case "$platform" in
      "Windows-x64-nasm")
        echo "nasm -w+all -f win64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/nasm-build-last
        nasm -w+all -f win64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "nasm -w+all -f elf64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/nasm-build-last
        nasm -w+all -f elf64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
    esac
    echo "-- nasm returned: $retValue" >> ./output/nasm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
    do_link=1
  fi
  if [ ! -f "./output/$fileNameWithoutExt" ]; then
    do_link=1
  elif [ -n "$(find "$stdlib" -prune -newer "./output/$fileNameWithoutExt" 2>/dev/null)" ]; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    case "$platform" in
      "Windows-x64-nasm")
        echo "ld -v -e _start -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\" -L \"$LD_ADDITIONAL_DIRECTORY\" -lkernel32 -lshell32" >> ./output/nasm-build-last
        ld -v -e _start -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" -L "$LD_ADDITIONAL_DIRECTORY" -lkernel32 -lshell32 >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "ld -v -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\"" >> ./output/nasm-build-last
        ld -v -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
    esac
    echo "-- ld returned: $retValue" >> ./output/nasm-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
  fi
  return "$retValue"
}
nasm_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
nasm_archive() {
  default_lang_archive "$1"
  nasmArchivePlatformTag=
  case "$currentPlatform" in
    "Linux"*) nasmArchivePlatformTag="Linux" ;;
    "FreeBSD"*) nasmArchivePlatformTag="FreeBSD" ;;
    "MINGW64_NT"*) nasmArchivePlatformTag="Windows" ;;
    *) nasmArchivePlatformTag= ;;
  esac
  nasmArchiveArchTag=
  case "$currentCpuArch" in
    "x86_64"|"amd64") nasmArchiveArchTag="x64" ;;
    *) nasmArchiveArchTag= ;;
  esac
  if [ -n "$nasmArchivePlatformTag" ] && [ -n "$nasmArchiveArchTag" ]; then
    targetTag="${nasmArchivePlatformTag}-${nasmArchiveArchTag}-nasm"
    add_stdlib_prebuilt_archive_or_marker "$1" "$targetTag"
  fi
}

# =============================================
#           Nim
# =============================================
nim_compile() {
  echo "nim compile --verbosity:3 --out:\"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/nim-build-last
  nim compile --verbosity:3 --out:"./output/$fileNameWithoutExt" "./$fileName" >> ./output/nim-build-last 2>&1
  retValue="$?"
  echo "-- nim returned: $retValue" >> ./output/nim-build-last
  return "$retValue"
}
nim_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
nim_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Oberon
# =============================================
oberon_compile() {
  echo "Copying $fileName to output..." > ./output/oberon-build-last
  cp "./$fileName" ./output/
  echo "cd ./output" >> ./output/oberon-build-last
  echo "voc -v -m \"./$fileName\"" >> ./output/oberon-build-last
  echo "cd .." >> ./output/oberon-build-last
  cd ./output
  voc -v -m "$fileName" >> ./oberon-build-last 2>&1
  retValue="$?"
  echo "-- voc returned: $retValue" >> ./oberon-build-last
  cd ..
  return "$retValue"
}
oberon_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
oberon_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Objective-C
# =============================================
objectivec_compile() {
  echo "clang -v -lobjc -lgnustep-base \$(gnustep-config --objc-flags) \$(gnustep-config --objc-libs) -L/usr/local/lib  \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/objectivec-build-last
  clang -v -lobjc -lgnustep-base $(gnustep-config --objc-flags) $(gnustep-config --objc-libs) -L/usr/local/lib  "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/objectivec-build-last 2>&1
  retValue="$?"
  echo "-- clang returned: $retValue" >> ./output/objectivec-build-last
  return "$retValue"
}
objectivec_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
objectivec_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Ocaml
# =============================================
ocaml_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ocamlopt -verbose -o \"./$fileNameWithoutExt\" \"./$fileName\"" > ./ocaml-build-last
  ocamlopt -verbose -o "./$fileNameWithoutExt" "./$fileName" >> ./ocaml-build-last 2>&1
  retValue="$?"
  echo "-- ocamlopt returned: $retValue" >> ./ocaml-build-last
  cd ..
  return "$retValue"
}
ocaml_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
ocaml_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Octave
# =============================================
octave_compile() {
  cp "./$fileName" "./output/${fileNameWithoutExt}shaved.m"
  return "$?"
}
octave_run() {
  cd ./output
  octave --quiet "${fileNameWithoutExt}shaved.m" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
octave_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Pascal
# =============================================
pascal_compile() {
  echo "Copying $fileName to output..." > ./output/pascal-build-last
  cp "./$fileName" ./output

  echo "cd ./output" >> ./output/pascal-build-last
  echo "fpc -va \"$fileName\"" >> ./output/pascal-build-last
  echo "cd .." >> ./output/pascal-build-last
  cd ./output
  fpc -va "$fileName" >> ./pascal-build-last 2>&1
  retValue="$?"
  echo "-- fpc returned: $retValue" >> ./pascal-build-last
  cd ..
  return "$retValue"
}
pascal_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
pascal_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Perl
# =============================================
perl_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "perl -w -c \"./$fileName\"" > ./perl-build-last
  perl -w -c "./$fileName" >> ./perl-build-last 2>&1
  retValue="$?"
  echo "-- perl returned: $retValue" >> ./perl-build-last
  cd ..
  return "$retValue"
}
perl_run() {
  cd ./output
  perl "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
perl_archive() {
  default_lang_archive "$@"
}

# =============================================
#           PHP
# =============================================
php_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "php -l \"./$fileName\"" > ./php-build-last
  php -l "./$fileName" >> ./php-build-last 2>&1
  retValue="$?"
  echo "-- php returned: $retValue" >> ./php-build-last
  cd ..
  return "$retValue"
}
php_run() {
  cd ./output
  php "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
php_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Prolog
# =============================================
prolog_compile() {
  echo "gplc -v \"$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/prolog-build-last
  gplc -v "$fileName" -o "./output/$fileNameWithoutExt" >> ./output/prolog-build-last 2>&1
  retValue="$?"
  echo "-- gplc returned: $retValue" >> ./output/prolog-build-last
  return "$retValue"
}
prolog_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
prolog_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Python
# =============================================
python_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "PYTHONVERBOSE=2 python -m py_compile \"./$fileName\"" > ./python-build-last
  PYTHONVERBOSE=2 python -m py_compile "./$fileName" >> ./python-build-last 2>&1
  retValue="$?"
  echo "-- python returned: $retValue" >> ./python-build-last
  cd ..
  return "$retValue"
}
python_run() {
  cd ./output
  python -u "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
python_archive() {
  default_lang_archive "$@"
}

# =============================================
#           R
# =============================================
r_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "Rscript --verbose --vanilla -e \"parse(file='$fileName')\"" > ./r-build-last
  Rscript --verbose --vanilla -e "parse(file='$fileName')" >> ./r-build-last 2>&1
  retValue="$?"
  echo "-- Rscript returned: $retValue" >> ./r-build-last
  cd ..
  return "$retValue"
}
r_run() {
  cd ./output
  Rscript "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
r_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Racket
# =============================================
racket_compile() {
  echo "raco exe -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/racket-build-last
  raco exe -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/racket-build-last 2>&1
  retValue="$?"
  echo "-- raco exe returned: $retValue" >> ./output/racket-build-last
  return "$retValue"
}
racket_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
racket_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Ruby
# =============================================
ruby_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ruby -w -c \"./$fileName\"" > ./ruby-build-last
  ruby -w -c "./$fileName" >> ./ruby-build-last 2>&1
  retValue="$?"
  echo "-- ruby returned: $retValue" >> ./ruby-build-last
  cd ..
  return "$retValue"
}
ruby_run() {
  cd ./output
  ruby "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
ruby_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Rust
# =============================================
rust_compile() {
  echo "rustc --verbose \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/rust-build-last
  rustc --verbose "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/rust-build-last 2>&1
  retValue="$?"
  echo "-- rustc returned: $retValue" >> ./output/rust-build-last
  return "$retValue"
}
rust_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
rust_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Scala
# =============================================
scala_compile() {
  echo "cp \"./$fileName\" ./output/" > ./output/scala-build-last
  echo "cd ./output" >> ./output/scala-build-last
  echo "scala compile \"./$fileName\"" >> ./output/scala-build-last
  echo "cd .." >> ./output/scala-build-last
  cp "./$fileName" ./output/
  cd ./output
  scala compile "./$fileName" >> ./scala-build-last 2>&1
  retValue="$?"
  echo "-- scala returned: $retValue" >> ./scala-build-last
  cd ..
  return "$retValue"
}
scala_run() {
  if [ "$#" -eq 0 ]; then
      set -- 15 10
  fi

  cd ./output
  scala run "$fileName" -- "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
scala_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Scheme
# =============================================
scheme_compile() {
  scheme_compiler_name="guild"
  if command -v guild > /dev/null 2>&1; then
    echo "guild compile --verbose -o \"./output/$fileNameWithoutExt.go\" \"./$fileName\"" > ./output/scheme-build-last
    guild compile --verbose -o "./output/$fileNameWithoutExt.go" "./$fileName" >> ./output/scheme-build-last 2>&1
    retValue="$?"
  else
    scheme_compiler_name="guile"
    echo "GUILE_DEBUG_LOAD=1 guile -c \"(compile-file \\\"./$fileName\\\" #:output-file \\\"./output/$fileNameWithoutExt.go\\\")\"" > ./output/scheme-build-last
    GUILE_DEBUG_LOAD=1 guile -c "(compile-file \"./$fileName\" #:output-file \"./output/$fileNameWithoutExt.go\")" >> ./output/scheme-build-last 2>&1
    retValue="$?"
  fi
  echo "-- $scheme_compiler_name returned: $retValue" >> ./output/scheme-build-last
  return "$retValue"
}
scheme_run() {
  guile -c "(load-compiled \"./output/$fileNameWithoutExt.go\")" "$@"
  return "$?"
}
scheme_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Simula
# =============================================
simula_compile() {
  echo "Copying $fileName to output..." > ./output/simula-build-last
  cp "./$fileName" ./output/
  echo "cd ./output" >> ./output/simula-build-last
  echo "rm -f ./gcc ./g++" >> ./output/simula-build-last
  echo "ln -s \"${DEREKALGOS_GCC13}${DEREKALGOS_GCC13NAME}\" ./gcc" >> ./output/simula-build-last
  echo "ln -s \"${DEREKALGOS_GCC13}${DEREKALGOS_GXX13NAME}\" ./g++" >> ./output/simula-build-last
  echo "PATH=\"$PWD:\$PATH\" cim -v \"./$fileName\"" >> ./output/simula-build-last
  echo "cd .." >> ./output/simula-build-last
  cd ./output/
  rm -f ./gcc ./g++
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GCC13NAME}" ./gcc
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GXX13NAME}" ./g++
  PATH="$PWD:$PATH" cim -v "./$fileName" >> ./simula-build-last 2>&1
  retValue="$?"
  echo "-- cim returned: $retValue" >> ./simula-build-last
  cd ..
  return "$retValue"
}
simula_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
simula_archive() {
  default_lang_archive "$@"
}

# =============================================
#           SmallTalk
# =============================================
smalltalk_compile() {
  return 0
}
smalltalk_run() {
  gst "./$fileName" -a "$@"
  return "$?"
}
smalltalk_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Swift
# =============================================
swift_compile() {
  echo "swiftc -v \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/swift-build-last
  swiftc -v "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/swift-build-last 2>&1
  retValue="$?"
  echo "-- swiftc returned: $retValue" >> ./output/swift-build-last
  return "$retValue"
}
swift_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
swift_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Tcl
# =============================================
tcl_compile() {
  return 0
}
tcl_run() {
  tclsh "$fileName" "$@"
  return "$?"
}
tcl_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Typescript
# =============================================
typescript_compile() {
  echo "tsc \"$fileName\" --outDir output --target esnext --skipLibCheck true --types node --listFiles --extendedDiagnostics" > ./output/typescript-build-last
  tsc "$fileName" --outDir output --target esnext --skipLibCheck true --types node --listFiles --extendedDiagnostics >> ./output/typescript-build-last 2>&1
  retValue="$?"
  echo "-- tsc returned: $retValue" >> ./output/typescript-build-last
  return "$retValue"
}
typescript_run() {
  node "./output/$fileNameWithoutExt.js" "$@"
  return "$?"
}
typescript_archive() {
  default_lang_archive "$@"
}

# =============================================
#           V
# =============================================
v_compile() {
  echo "v \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/v-build-last
  v "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/v-build-last 2>&1
  retValue="$?"
  echo "-- v returned: $retValue" >> ./output/v-build-last
  return "$retValue"
}
v_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
v_archive() {
  default_lang_archive "$@"
}

# =============================================
#           Visual Basic .Net
# =============================================
visualbasic_compile() {
  if [ ! -f "./output/$fileName" ]; then
    cp "./$fileName" ./output/
  elif [ -n "$(find "./$fileName" -prune -newer "./output/$fileName" 2>/dev/null)" ]; then
    cp "./$fileName" ./output/
  fi
  cd ./output

  if [ ! -f "$fileNameWithoutExt.vbproj" ]; then
    template_content=$(cat ../../../../templates/template.vbproj)
    get_variabled_string "$template_content" > "$fileNameWithoutExt.vbproj"
  fi

  echo "cd ./output" > ./visualbasic-build-last
  echo "echo [$fileNameWithoutExt.vbproj]" >> ./visualbasic-build-last
  echo "dotnet build --verbosity:detailed" >> ./visualbasic-build-last
  echo "cd .." >> ./visualbasic-build-last
  dotnet build --verbosity:detailed >> ./visualbasic-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./visualbasic-build-last
  cd ..
  return "$retValue"
}
visualbasic_run() {
  "./output/bin/Debug/net10.0/$fileNameWithoutExt" "$@"
  return "$?"
}
visualbasic_archive() {
  default_lang_archive "$@"
}

# =============================================
#           WASM (wat)
# =============================================
wat_compile() {
  echo "cp \"$fileName\" \"./output/$fileName\"" > ./output/wat-build-last
  echo "cd ./output" >> ./output/wat-build-last
  echo "wat2wasm -v \"$fileName\" -o \"$fileNameWithoutExt.wasm\"" >> ./output/wat-build-last
  echo "cd .." >> ./output/wat-build-last
  cp "$fileName" "./output/$fileName"
  cd ./output
  wat2wasm -v "$fileName" -o "$fileNameWithoutExt.wasm" >> ./wat-build-last 2>&1
  retValue="$?"
  echo "-- wat2wasm returned: $retValue" >> ./wat-build-last
  cd ..
  return "$retValue"
}
wat_run() {
  node ../../../run-wasm.js "./output/$fileNameWithoutExt.wasm" "$@"
  return "$?"
}
wat_archive() {
  default_lang_archive "$@"
}

# =============================================
#           ZIG
# =============================================
zig_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "zig build-exe \"./$fileName\"" > ./zig-build-last
  zig build-exe "./$fileName" >> ./zig-build-last 2>&1
  retValue="$?"
  echo "-- zig returned: $retValue" >> ./zig-build-last
  cd ..
  return "$retValue"
}
zig_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
zig_archive() {
  default_lang_archive "$@"
}

# =============================================
# =============================================

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

# If we are not cleaning, we look at the file extension and specify
# what drives the compilation and running.
# Required:
#   lang : must be set to the language that matches the extension.
#          Used to call compile and run and check for file updates.
#   testFile : if the file specified in this variable does not exist,
#          then we do not attempt to run by attempt to show
#          ./output/lang-build-last instead.

case "$fileExtension" in
  "adb") lang="ada"; testFile="./output/$fileNameWithoutExt";;
  "asm") lang="asm"; testFile="./output/$fileNameWithoutExt";;
  "bal") lang="ballerina"; testFile="./output/$fileNameWithoutExt.jar";;
  "bas") lang="freebasic"; testFile="./output/$fileNameWithoutExt";;
  "c") lang="c"; testFile="./output/$fileNameWithoutExt";;
  "clj") lang="clojure"; testFile="./output/target/uberjar/$fileNameWithoutExt-1.0.0-standalone.jar";;
  "cob") lang="cobol"; testFile="./output/$fileNameWithoutExt";;
  "cpp") lang="cpp"; testFile="./output/$fileNameWithoutExt";;
  "cs") lang="csharp"; testFile="./output/bin/Debug/net10.0/$fileNameWithoutExt";;
  "d") lang="d"; testFile="./output/$fileNameWithoutExt";;
  "dart") lang="dart"; testFile="./output/$fileNameWithoutExt";;
  "e") lang="eiffel"; testFile="./output/EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt";;
  "erl") lang="erlang"; testFile="./output/$fileNameWithoutExt.beam";;
  "exs") lang="elixir"; testFile="./$fileName";;
  "f90") lang="fortran"; testFile="./output/$fileNameWithoutExt";;
  "factor") lang="factor"; testFile="./$fileName";;
  "fs") lang="fsharp"; testFile="./output/bin/Debug/net10.0/$fileNameWithoutExt";;
  "fth") lang="forth"; testFile="./$fileName";;
  "gleam") lang="gleam"; testFile="./output/build/dev/erlang/$fileNameWithoutExt/ebin/$fileNameWithoutExt.beam";;
  "go") lang="go"; testFile="./output/$fileNameWithoutExt";;
  "hs") lang="haskell"; testFile="./output/$fileNameWithoutExt";;
  "hx") lang="haxe"; testFile="./$fileName";;
  "icn") lang="icon"; testFile="./output/$fileNameWithoutExt";;
  "idr") lang="idris"; testFile="./output/build/exec/$fileNameWithoutExt";;
  "java") lang="java"; testFile="./output/$fileNameWithoutExt.jar";;
  "jl") lang="julia"; testFile="./$fileName";;
  "js") lang="javascript"; testFile="./output/$fileName";;
  "kit") lang="kit"; testFile="./$fileName";;
  "kt") lang="kotlin"; testFile="./output/$fileNameWithoutExt.jar";;
  "ll") lang="llvmir"; testFile="./output/$fileNameWithoutExt";;
  "lua") lang="lua"; testFile="./output/$fileNameWithoutExt.luac";;
  "m") lang="objectivec"; testFile="./output/$fileNameWithoutExt";;
  "m3") lang="modula3"; testFile="./output/AMD64_LINUX/prog";;
  "mat") lang="octave"; testFile="./output/${fileNameWithoutExt}shaved.m";;
  "ml") lang="ocaml"; testFile="./output/$fileNameWithoutExt";;
  "mms") lang="mmixal"; testFile="./output/$fileNameWithoutExt.mmo";;
  "Mod") lang="oberon"; testFile="./output/$fileNameWithoutExt";;
  "mojo") lang="mojo"; testFile="./output/$fileName";;
  "moo") lang="mercury"; testFile="./output/$fileNameWithoutExt";;
  "nasm") lang="nasm"; testFile="./output/$fileNameWithoutExt";;
  "nim") lang="nim"; testFile="./output/$fileNameWithoutExt";;
  "pas") lang="pascal"; testFile="./output/$fileNameWithoutExt";;
  "php") lang="php"; testFile="./output/$fileName";;
  "pl") lang="prolog"; testFile="./output/$fileNameWithoutExt";;
  "plx") lang="perl"; testFile="./output/$fileName";;
  "py") lang="python"; testFile="./output/$fileName";;
  "r") lang="r"; testFile="./output/$fileName";;
  "rb") lang="ruby"; testFile="./output/$fileName";;
  "rkt") lang="racket"; testFile="./output/$fileNameWithoutExt";;
  "rs") lang="rust"; testFile="./output/$fileNameWithoutExt";;
  "s") lang="arm64asm"; testFile="./output/$fileNameWithoutExt";;
  "scala") lang="scala"; testFile="./output/$fileName";;
  "scm") lang="scheme"; testFile="./$fileName";;
  "sim") lang="simula"; testFile="./output/$fileNameWithoutExt";;
  "st") lang="smalltalk"; testFile="./$fileName";;
  "swift") lang="swift"; testFile="./output/$fileNameWithoutExt";;
  "tcl") lang="tcl"; testFile="./$fileName";;
  "ts") lang="typescript"; testFile="./output/$fileNameWithoutExt.js";;
  "v") lang="v"; testFile="./output/$fileNameWithoutExt";;
  "vb") lang="visualbasic"; testFile="./output/bin/Debug/net10.0/$fileNameWithoutExt";;
  "wat") lang="wat"; testFile="./output/$fileNameWithoutExt.wasm";;
  "zig") lang="zig"; testFile="./output/$fileNameWithoutExt";;
  *) echo "Unrecognized file extension, not building!"; exit 64;;
esac

# Now, we should check if the environment wants our language
# to run via a docker image, in which case, we should go ahead
# and do that then exit.

runOnDocker=$(get_lang_route_value "$DEREKALGOS_RUNONDOCKER" "$lang")
if [ "$checkOnlyMode" -eq 1 ]; then
  case "$checkOnlyRoute" in
    native|ssh)
      runOnDocker=""
      ;;
    docker)
      if [ -z "$runOnDocker" ]; then
        runOnDocker="check-only-docker"
      fi
      ;;
  esac
fi
if [ -n "$runOnDocker" ]; then
  mkdir -p ./output
  docker_log="./output/${lang}-build-last"
  echo "STARTING DOCKER RELAY BUILD..." > "$docker_log"
  echo "ROUTE: Docker image $runOnDocker" >> "$docker_log"
  echo "HOST: platform=$hostPlatform cpu=$hostCpuArch translation=$hostTranslation" >> "$docker_log"

  if [ "$checkOnlyMode" -eq 1 ] && [ "$checkOnlyRoute" = "docker" ]; then
    echo "CHECK-ONLY ROUTE: docker relay simulated" >> "$docker_log"
    echo "CHECK-ONLY: would relay via docker image '$runOnDocker'" >> "$docker_log"
    echo "CHECK-ONLY: would run sh /build/run.sh --check-only $fileName <args>" >> "$docker_log"
    if [ -n "$lastCommandOutputLog" ]; then
      {
        echo "---- docker-check-only-simulated ----"
        cat "$docker_log"
      } >> "$lastCommandOutputLog"
    fi
    echo "CHECK-ONLY: docker relay simulated for $lang"
    exit 0
  fi

  if [ "$hostPlatform" = "Darwin" ] && [ "$hostCpuArch" = "arm64" ]; then
    echo "NOTE: Docker run uses --platform linux/amd64 on arm64 host; CPU emulation may apply." >> "$docker_log"
  fi

  append_docker_relay_fallback_log() {
    if [ -z "$lastCommandOutputLog" ] || [ ! -f "$docker_log" ]; then
      return
    fi
    if [ ! -f "$lastCommandOutputLog" ]; then
      DEREKALGOS_EXECUTION_ROUTE="docker-relay"
      DEREKALGOS_HOST_CWD="$startDir"
      DEREKALGOS_HOST_CPUARCH="$hostCpuArch"
      DEREKALGOS_HOST_PLATFORM="$hostPlatform"
      DEREKALGOS_HOST_TRANSLATION="$hostTranslation"
      init_last_command_output_log
    fi
    {
      echo "---- docker-relay-fallback-log ----"
      cat "$docker_log"
    } >> "$lastCommandOutputLog"
  }

  if ! command -v docker > /dev/null 2>&1; then
    echo "Docker relay aborted: docker command not found in PATH" >> "$docker_log"
    append_docker_relay_fallback_log
    cat "$docker_log"
    exit 127
  fi

  CURRENT_GIT_DIR=$(resolve_abs_path ../../../)
  if [ -z "$CURRENT_GIT_DIR" ] || [ ! -d "$CURRENT_GIT_DIR" ]; then
    echo "Docker relay aborted: unable to resolve repository root directory" >> "$docker_log"
    append_docker_relay_fallback_log
    cat "$docker_log"
    exit 2
  fi
  if [ ! -f "$CURRENT_GIT_DIR/run.sh" ]; then
    echo "Docker relay aborted: missing runner script at $CURRENT_GIT_DIR/run.sh" >> "$docker_log"
    append_docker_relay_fallback_log
    cat "$docker_log"
    exit 2
  fi
  if [ ! -r "$CURRENT_GIT_DIR/run.sh" ]; then
    echo "Docker relay aborted: runner script is not readable at $CURRENT_GIT_DIR/run.sh" >> "$docker_log"
    append_docker_relay_fallback_log
    cat "$docker_log"
    exit 2
  fi

  docker_timeout_arg=""
  if [ "$timeoutFromHost" -eq 1 ]; then
    docker_timeout_arg="$timeoutConfig"
    echo "TIMEOUT SOURCE: host ($timeoutConfig)" >> "$docker_log"
  else
    echo "TIMEOUT SOURCE: container-profile-or-default" >> "$docker_log"
  fi

  if [ "$checkOnlyMode" -eq 1 ]; then
    echo "RUN_AND_LOG_SKIP_SHARED_APPEND=1 docker run --rm --platform linux/amd64 -v \"<repo>\":/build -w \"/build/src/$packName/$algoName/\" $runOnDocker sh -c 'if [ -n \"\$1\" ]; then DEREKALGOS_TIMEOUT=\"\$1\"; export DEREKALGOS_TIMEOUT; fi; DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE=\"\$2\"; DEREKALGOS_LAST_COMMAND_OUTPUT_LOG=\"\$3\"; DEREKALGOS_EXECUTION_ROUTE=\"\$4\"; DEREKALGOS_HOST_CWD=\"\$5\"; DEREKALGOS_HOST_CPUARCH=\"\$6\"; DEREKALGOS_HOST_PLATFORM=\"\$7\"; DEREKALGOS_HOST_TRANSLATION=\"\$8\"; export DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE DEREKALGOS_LAST_COMMAND_OUTPUT_LOG DEREKALGOS_EXECUTION_ROUTE DEREKALGOS_HOST_CWD DEREKALGOS_HOST_CPUARCH DEREKALGOS_HOST_PLATFORM DEREKALGOS_HOST_TRANSLATION; shift 8; sh /build/run.sh \"\$@\"' sh \"$docker_timeout_arg\" \"\" \"$lastCommandOutputLog\" \"docker-relay\" \"$startDir\" \"$hostCpuArch\" \"$hostPlatform\" \"$hostTranslation\" --check-only \"$fileName\" <args>" >> "$docker_log"
    RUN_AND_LOG_SKIP_SHARED_APPEND=1 run_and_log_output "$docker_log" docker run --rm --platform linux/amd64 -v "$CURRENT_GIT_DIR":/build -w "/build/src/$packName/$algoName/" $runOnDocker sh -c 'if [ -n "$1" ]; then DEREKALGOS_TIMEOUT="$1"; export DEREKALGOS_TIMEOUT; fi; DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE="$2"; DEREKALGOS_LAST_COMMAND_OUTPUT_LOG="$3"; DEREKALGOS_EXECUTION_ROUTE="$4"; DEREKALGOS_HOST_CWD="$5"; DEREKALGOS_HOST_CPUARCH="$6"; DEREKALGOS_HOST_PLATFORM="$7"; DEREKALGOS_HOST_TRANSLATION="$8"; export DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE DEREKALGOS_LAST_COMMAND_OUTPUT_LOG DEREKALGOS_EXECUTION_ROUTE DEREKALGOS_HOST_CWD DEREKALGOS_HOST_CPUARCH DEREKALGOS_HOST_PLATFORM DEREKALGOS_HOST_TRANSLATION; shift 8; sh /build/run.sh "$@"' sh "$docker_timeout_arg" "" "$lastCommandOutputLog" "docker-relay" "$startDir" "$hostCpuArch" "$hostPlatform" "$hostTranslation" --check-only "$fileName" "$@"
  elif [ "$compileOnlyMode" -eq 1 ]; then
    echo "RUN_AND_LOG_SKIP_SHARED_APPEND=1 docker run --rm --platform linux/amd64 -v \"<repo>\":/build -w \"/build/src/$packName/$algoName/\" $runOnDocker sh -c 'if [ -n \"\$1\" ]; then DEREKALGOS_TIMEOUT=\"\$1\"; export DEREKALGOS_TIMEOUT; fi; DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE=\"\$2\"; DEREKALGOS_LAST_COMMAND_OUTPUT_LOG=\"\$3\"; DEREKALGOS_EXECUTION_ROUTE=\"\$4\"; DEREKALGOS_HOST_CWD=\"\$5\"; DEREKALGOS_HOST_CPUARCH=\"\$6\"; DEREKALGOS_HOST_PLATFORM=\"\$7\"; DEREKALGOS_HOST_TRANSLATION=\"\$8\"; export DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE DEREKALGOS_LAST_COMMAND_OUTPUT_LOG DEREKALGOS_EXECUTION_ROUTE DEREKALGOS_HOST_CWD DEREKALGOS_HOST_CPUARCH DEREKALGOS_HOST_PLATFORM DEREKALGOS_HOST_TRANSLATION; shift 8; sh /build/run.sh \"\$@\"' sh \"$docker_timeout_arg\" \"\" \"$lastCommandOutputLog\" \"docker-relay\" \"$startDir\" \"$hostCpuArch\" \"$hostPlatform\" \"$hostTranslation\" --compile-only \"$fileName\" <args>" >> "$docker_log"
    RUN_AND_LOG_SKIP_SHARED_APPEND=1 run_and_log_output "$docker_log" docker run --rm --platform linux/amd64 -v "$CURRENT_GIT_DIR":/build -w "/build/src/$packName/$algoName/" $runOnDocker sh -c 'if [ -n "$1" ]; then DEREKALGOS_TIMEOUT="$1"; export DEREKALGOS_TIMEOUT; fi; DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE="$2"; DEREKALGOS_LAST_COMMAND_OUTPUT_LOG="$3"; DEREKALGOS_EXECUTION_ROUTE="$4"; DEREKALGOS_HOST_CWD="$5"; DEREKALGOS_HOST_CPUARCH="$6"; DEREKALGOS_HOST_PLATFORM="$7"; DEREKALGOS_HOST_TRANSLATION="$8"; export DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE DEREKALGOS_LAST_COMMAND_OUTPUT_LOG DEREKALGOS_EXECUTION_ROUTE DEREKALGOS_HOST_CWD DEREKALGOS_HOST_CPUARCH DEREKALGOS_HOST_PLATFORM DEREKALGOS_HOST_TRANSLATION; shift 8; sh /build/run.sh "$@"' sh "$docker_timeout_arg" "" "$lastCommandOutputLog" "docker-relay" "$startDir" "$hostCpuArch" "$hostPlatform" "$hostTranslation" --compile-only "$fileName" "$@"
  else
    echo "RUN_AND_LOG_SKIP_SHARED_APPEND=1 docker run --rm --platform linux/amd64 -v \"<repo>\":/build -w \"/build/src/$packName/$algoName/\" $runOnDocker sh -c 'if [ -n \"\$1\" ]; then DEREKALGOS_TIMEOUT=\"\$1\"; export DEREKALGOS_TIMEOUT; fi; DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE=\"\$2\"; DEREKALGOS_LAST_COMMAND_OUTPUT_LOG=\"\$3\"; DEREKALGOS_EXECUTION_ROUTE=\"\$4\"; DEREKALGOS_HOST_CWD=\"\$5\"; DEREKALGOS_HOST_CPUARCH=\"\$6\"; DEREKALGOS_HOST_PLATFORM=\"\$7\"; DEREKALGOS_HOST_TRANSLATION=\"\$8\"; export DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE DEREKALGOS_LAST_COMMAND_OUTPUT_LOG DEREKALGOS_EXECUTION_ROUTE DEREKALGOS_HOST_CWD DEREKALGOS_HOST_CPUARCH DEREKALGOS_HOST_PLATFORM DEREKALGOS_HOST_TRANSLATION; shift 8; sh /build/run.sh \"\$@\"' sh \"$docker_timeout_arg\" \"\" \"$lastCommandOutputLog\" \"docker-relay\" \"$startDir\" \"$hostCpuArch\" \"$hostPlatform\" \"$hostTranslation\" \"$fileName\" <args>" >> "$docker_log"
    RUN_AND_LOG_SKIP_SHARED_APPEND=1 run_and_log_output "$docker_log" docker run --rm --platform linux/amd64 -v "$CURRENT_GIT_DIR":/build -w "/build/src/$packName/$algoName/" $runOnDocker sh -c 'if [ -n "$1" ]; then DEREKALGOS_TIMEOUT="$1"; export DEREKALGOS_TIMEOUT; fi; DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE="$2"; DEREKALGOS_LAST_COMMAND_OUTPUT_LOG="$3"; DEREKALGOS_EXECUTION_ROUTE="$4"; DEREKALGOS_HOST_CWD="$5"; DEREKALGOS_HOST_CPUARCH="$6"; DEREKALGOS_HOST_PLATFORM="$7"; DEREKALGOS_HOST_TRANSLATION="$8"; export DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE DEREKALGOS_LAST_COMMAND_OUTPUT_LOG DEREKALGOS_EXECUTION_ROUTE DEREKALGOS_HOST_CWD DEREKALGOS_HOST_CPUARCH DEREKALGOS_HOST_PLATFORM DEREKALGOS_HOST_TRANSLATION; shift 8; sh /build/run.sh "$@"' sh "$docker_timeout_arg" "" "$lastCommandOutputLog" "docker-relay" "$startDir" "$hostCpuArch" "$hostPlatform" "$hostTranslation" "$fileName" "$@"
  fi
  retValue="$?"
  echo "-- docker returned: $retValue" >> "$docker_log"
  echo "---- DOCKER RELAY BUILD END" >> "$docker_log"

  # If docker failed, append relay diagnostics to shared output.
  if [ "$retValue" -ne 0 ] && [ -n "$lastCommandOutputLog" ] && [ -f "$docker_log" ]; then
    append_docker_relay_fallback_log
  fi

  exit "$retValue"
fi

# Now, we should check if the environment wants our language
# to run on remotely via ssh, in which case, we should go ahead
# and do that then exit.

runOnSsh=$(get_lang_route_value "$DEREKALGOS_RUNONSSH" "$lang")
if [ "$checkOnlyMode" -eq 1 ]; then
  case "$checkOnlyRoute" in
    native|docker)
      runOnSsh=""
      ;;
    ssh)
      if [ -z "$runOnSsh" ]; then
        runOnSsh="check-only-ssh"
      fi
      ;;
  esac
fi
if [ -n "$runOnSsh" ]; then
  mkdir -p ./output
  ssh_log="./output/${lang}-build-last"
  echo "STARTING SSH RELAY BUILD..." > "$ssh_log"
  echo "ROUTE: SSH target $runOnSsh" >> "$ssh_log"

  if [ "$checkOnlyMode" -eq 1 ] && [ "$checkOnlyRoute" = "ssh" ]; then
    echo "CHECK-ONLY ROUTE: ssh relay simulated" >> "$ssh_log"
    echo "CHECK-ONLY: would relay via SSH target '$runOnSsh'" >> "$ssh_log"
    echo "CHECK-ONLY: would run remote run.sh --check-only $fileName <args>" >> "$ssh_log"
    if [ -n "$lastCommandOutputLog" ]; then
      {
        echo "---- ssh-check-only-simulated ----"
        cat "$ssh_log"
      } >> "$lastCommandOutputLog"
    fi
    echo "CHECK-ONLY: ssh relay simulated for $lang"
    exit 0
  fi

  if ! command -v scp > /dev/null 2>&1; then
    echo "SSH relay aborted: scp command not found in PATH" >> "$ssh_log"
    cat "$ssh_log"
    exit 127
  fi
  if ! command -v ssh > /dev/null 2>&1; then
    echo "SSH relay aborted: ssh command not found in PATH" >> "$ssh_log"
    cat "$ssh_log"
    exit 127
  fi

  if ! parse_ssh_route_definition "$runOnSsh"; then
    echo "Missing or invalid SSH config in DEREKALGOS_RUNONSSH for language '$lang'" >> "$ssh_log"
    echo "Expected value format: language=ssh-destination|code-dir|run-script" >> "$ssh_log"
    echo "                   or: language=ssh-address|ssh-user|ssh-port|code-dir|run-script" >> "$ssh_log"
    echo "Example (legacy): forth=coderun-vm|/home/coderun/codefiles|../run.sh" >> "$ssh_log"
    echo "Example (explicit): forth=127.0.0.1|coderun|2222|/home/coderun/codefiles|../run.sh" >> "$ssh_log"
    cat "$ssh_log"
    exit 2
  fi

  if [ -n "$ssh_port" ]; then
    echo "scp -P \"$ssh_port\" \"./$fileName\" \"$ssh_destination:$ssh_codedir/$fileName\"" >> "$ssh_log"
    run_and_log_output "$ssh_log" scp -P "$ssh_port" "./$fileName" "$ssh_destination:$ssh_codedir/$fileName"
  else
    echo "scp \"./$fileName\" \"$ssh_destination:$ssh_codedir/$fileName\"" >> "$ssh_log"
    run_and_log_output "$ssh_log" scp "./$fileName" "$ssh_destination:$ssh_codedir/$fileName"
  fi
  retValue="$?"
  echo "-- scp returned: $retValue" >> "$ssh_log"
  if [ "$retValue" -ne 0 ]; then
    echo "---- SSH RELAY BUILD END" >> "$ssh_log"
    exit "$retValue"
  fi

  ToRunOnSSH="cd $(shell_quote "$ssh_codedir") && $(shell_quote "$ssh_runscript")"
  if [ "$checkOnlyMode" -eq 1 ]; then
    ToRunOnSSH="$ToRunOnSSH --check-only"
  elif [ "$compileOnlyMode" -eq 1 ]; then
    ToRunOnSSH="$ToRunOnSSH --compile-only"
  fi
  ToRunOnSSH="$ToRunOnSSH $(shell_quote "$fileName")"
  for arg in "$@"; do
    ToRunOnSSH="$ToRunOnSSH $(shell_quote "$arg")"
  done
  if [ -n "$ssh_port" ]; then
    echo "ssh -p \"$ssh_port\" \"$ssh_destination\" \"$ToRunOnSSH\"" >> "$ssh_log"
    run_and_log_output "$ssh_log" ssh -p "$ssh_port" "$ssh_destination" "$ToRunOnSSH"
  else
    echo "ssh \"$ssh_destination\" \"$ToRunOnSSH\"" >> "$ssh_log"
    run_and_log_output "$ssh_log" ssh "$ssh_destination" "$ToRunOnSSH"
  fi
  retValue="$?"
  echo "-- ssh returned: $retValue" >> "$ssh_log"
  echo "---- SSH RELAY BUILD END" >> "$ssh_log"
  exit "$retValue"
fi

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

# For local runs, initialize once after output cleanup/setup.
# Docker child handles its own header; SSH is remote-native.
if [ -z "$runOnDocker" ] && [ -z "$runOnSsh" ]; then
  if [ -z "$DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE" ] || [ "$destroyOutput" -eq 1 ] || [ ! -f "$lastCommandOutputLog" ]; then
    init_last_command_output_log
  fi
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
