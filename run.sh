#! /bin/sh

# First argument must either be a supported filename or
# "clean". If "clean", the output directory is destroyed
# and the script exits. Otherwise, it will continue to try
# to compile the file specified, passing in any other
# arguments to the code as command line arguments

# Print CLI usage and option notes.
print_usage() {
  echo "Usage: $0 [--source-profile=<profile-path>] <filename|clean> [args...]"
  echo "       $0 --help"
  echo ""
  echo "--help as the first parameter will display this usage information."
  echo ""
  echo "This is intended to be run from the command line in the directory of the filename specified as the working directory."
  echo ""
  echo "filename must be a supported source file. This will be compiled where possible and run immediately."
  echo "Build and run artifacts and logs will be placed in the output directory."
  echo ""
  echo "This only supports optional parameters in the first argument position, if any given."
  echo "If the first parameter is not recognized, it will be treated as a filename."
  echo "All following parameters will be passed as command line arguments to the final executable."
  echo ""
  echo "If --source-profile=<profile-path> is specified, the script will source the given profile."
  echo "If --source-profile= (empty) is specified, profile sourcing will be disabled."
  echo "  Otherwise, the default profile for the platform will be sourced."
  echo "  If the sourced file does not exist or contains an error, the script will continue without notice."
  echo "  All output from sourcing the profile will be logged to $HOME/.cache/derekalgos/profile.log."
  echo "  If that cache directory is unavailable, logging falls back to ${TMPDIR:-/tmp}/derekalgos-profile.log."
  echo ""
  echo "Please configure your local profile file to set environment variables to control this script otherwise."
  echo ""
  echo "Entering 'clean' instead of a filename will erase the local output directory, clean the stdlib, and exit."
}

source_profile_override_set=0
source_profile_override_path=
if [ $# -ge 1 ]; then
  case "$1" in
    --source-profile=*)
      source_profile_override_set=1
      source_profile_override_path=${1#--source-profile=}
      shift 1
      ;;
    --help)
      print_usage
      exit 0
      ;;
  esac
fi

if [ $# -lt 1 ]; then
  print_usage
  exit 64
fi

fileName=$1
fileNameWithoutExt="${fileName%.*}"
fileExtension="${fileName##*.}"
shift 1
currentCpuArch=$(uname -m)
currentPlatform=$(uname -s)
start_dir=$PWD
dir="${PWD%/*}"
packName="${dir##*/}"
algoName="${PWD##*/}"
moduleName="$(echo "$fileNameWithoutExt" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
lang=
testFile=
destroy_output=0
last_command_output_log="${DEREKALGOS_LAST_COMMAND_OUTPUT_LOG:-./output/last-command-output}"
useTimeout="${useTimeout}"
if [ -z "$useTimeout" ]; then
  useTimeout="-k 10s 1m"
fi
time_precision_unit="ms"

# Compile a run header for the run output
if [ -z "$DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE" ]; then
  mkdir -p ./output
  : > "$last_command_output_log"
  if command -v date > /dev/null 2>&1; then
    run_header_time=$(date '+%Y-%m-%d %H:%M:%S %Z')
  else
    run_header_time="unknown-time"
  fi
  run_header_route="native"
  if [ -n "$DEREKALGOS_RUNONDOCKER" ]; then
    run_header_route="docker-candidate"
  fi
  if [ -n "$DEREKALGOS_RUNONSSH" ]; then
    run_header_route="ssh-candidate"
  fi
  {
    echo "==== RUN START ===="
    echo "time: $run_header_time"
    echo "cwd: $PWD"
    echo "file: $fileName"
    echo "ext: $fileExtension"
    echo "cpu: $currentCpuArch"
    echo "platform: $currentPlatform"
    echo "route: $run_header_route"
    echo "timeout: $useTimeout"
    echo "==================="
  } >> "$last_command_output_log"
  export DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE=1
fi
export DEREKALGOS_LAST_COMMAND_OUTPUT_LOG="$last_command_output_log"

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
if [ "$source_profile_override_set" -eq 1 ]; then
  if [ -n "$source_profile_override_path" ]; then
    # If profile sourcing fails (missing file, parse error, etc), continue anyway by design.
    . "$source_profile_override_path" >> "$profileOutCache" 2>&1
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

# Detect whether the local date command supports millisecond precision.
detect_time_precision() {
  ms_sample=$($dateCmd +%s%3N 2>/dev/null)
  case "$ms_sample" in
    ''|*[!0-9]*)
      time_precision_unit="s"
      ;;
    *)
      time_precision_unit="ms"
      ;;
  esac
}
detect_time_precision

# Return current time in detected precision units.
get_ms_time() {
  if [ "$time_precision_unit" = "ms" ]; then
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

# Validate a variable name for safe indirect expansion.
is_valid_env_name() {
  case "$1" in
    ''|*[!A-Za-z0-9_]*|[0-9]*) return 1 ;;
    *) return 0 ;;
  esac
}

# Safely read an environment variable by name.
get_env_value() {
  var_name="$1"
  if ! is_valid_env_name "$var_name"; then
    return 1
  fi
  # WARNING: eval-based templating is intentionally retained for now; replace with safer rendering when practical.
  eval "printf '%s' \"\${$var_name}\""
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

# Run a command, stream its output, and append output to logs.
run_and_log_output() {
  relay_log_file="$1"
  shift
  (
    relay_tmp_file=$(make_tmp_file "relay")

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
  if command -v mktemp > /dev/null 2>&1; then
    mktemp "${TMPDIR:-/tmp}/derekalgos-${tmp_label}.XXXXXX"
  else
    tmp_file="${TMPDIR:-/tmp}/derekalgos-${tmp_label}.$$"
    : > "$tmp_file"
    printf '%s\n' "$tmp_file"
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

  if [ -n "$last_command_output_log" ] && [ "$flush_log_file" != "$last_command_output_log" ]; then
    cat "$flush_tmp_file" >> "$last_command_output_log"
    flush_last_ret="$?"
    if [ "$flush_last_ret" -ne 0 ]; then
      echo "WARNING: failed to append $flush_label to $last_command_output_log (returned $flush_last_ret)" >&2
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

# Parse useTimeout into main timeout and optional kill-after timeout.
parse_timeout_config() {
  parsed_timeout_main="1m"
  parsed_timeout_kill=

  case "$useTimeout" in
    '-k '*)
      timeout_tokens="${useTimeout#-k }"
      timeout_kill_token="${timeout_tokens%% *}"
      timeout_main_token="${timeout_tokens##* }"
      if [ "${timeout_kill_token} ${timeout_main_token}" = "$timeout_tokens" ] && \
         is_valid_duration_token "$timeout_kill_token" && \
         is_valid_duration_token "$timeout_main_token"; then
        parsed_timeout_kill="$timeout_kill_token"
        parsed_timeout_main="$timeout_main_token"
      else
        if [ -n "$last_command_output_log" ]; then
          echo "WARNING: invalid timeout '$useTimeout'; falling back to '1m'" >> "$last_command_output_log"
        fi
      fi
      ;;
    *)
      if is_valid_duration_token "$useTimeout"; then
        parsed_timeout_main="$useTimeout"
      else
        if [ -n "$last_command_output_log" ]; then
          echo "WARNING: invalid timeout '$useTimeout'; falling back to '1m'" >> "$last_command_output_log"
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

  (
    sleep "$watcher_main_seconds"
    if kill -0 "$watcher_pid" 2>/dev/null; then
      : > "$watcher_flag_file"
      kill -TERM "$watcher_pid" 2>/dev/null
      if [ -n "$watcher_kill_seconds" ]; then
        sleep "$watcher_kill_seconds"
        kill -KILL "$watcher_pid" 2>/dev/null
      fi
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
    _tmp=$(make_tmp_file "relay")
    _flag=$(make_tmp_file "timeout")
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
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NORMAL='\033[0m' # Resets the color to default

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
  echo "gnatmake -q -D output -o \"./output/$fileNameWithoutExt\" \"$fileName\"" > ./output/ada-build-last
  gnatmake -q -D output -o "./output/$fileNameWithoutExt" "$fileName" >> ./output/ada-build-last  2>&1
  retValue="$?"
  echo "-- GNAT returned: $retValue" >> ./output/ada-build-last
  return "$retValue"
}
ada_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
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
  cd ../../../stdlib || { echo "Failed to cd into stdlib for arm64asm build" >> "$start_dir/output/arm64asm-build-last"; return 1; }
  ./build.sh "$platform" >> "$start_dir/output/arm64asm-build-last" 2>&1
  retValue="$?"
  cd "$start_dir" || { echo "Failed to return to start directory: $start_dir" >> "$start_dir/output/arm64asm-build-last"; return 1; }
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
    echo "as -arch arm64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/arm64asm-build-last
    as -arch arm64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/arm64asm-build-last 2>&1
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
    echo "ld -e _start -arch arm64 -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\" -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path)" >> ./output/arm64asm-build-last
    ld -e _start -arch arm64 -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path) >> ./output/arm64asm-build-last 2>&1
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
  cd ../../../stdlib || { echo "Failed to cd into stdlib for asm build" >> "$start_dir/output/asm-build-last"; return 1; }
  ./build.sh "$platform" >> "$start_dir/output/asm-build-last" 2>&1
  retValue="$?"
  cd "$start_dir" || { echo "Failed to return to start directory: $start_dir" >> "$start_dir/output/asm-build-last"; return 1; }
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
        echo "as --defsym WINDOWS=1 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/asm-build-last
        as --defsym WINDOWS=1 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "as --defsym WINDOWS=0 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/asm-build-last
        as --defsym WINDOWS=0 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/asm-build-last 2>&1
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
        echo "ld -e _start -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\" -L \"$LD_ADDITIONAL_DIRECTORY\" -lkernel32 -lshell32" >> ./output/asm-build-last
        ld -e _start -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" -L "$LD_ADDITIONAL_DIRECTORY" -lkernel32 -lshell32 >> ./output/asm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "ld -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\"" >> ./output/asm-build-last
        ld -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" >> ./output/asm-build-last 2>&1
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

# =============================================
#           Ballerina
# =============================================
ballerina_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "bal build \"$fileName\"" > ./ballerina-build-last
  bal build "$fileName" >> ./ballerina-build-last  2>&1
  retValue="$?"
  echo "-- bal returned: $retValue" >> ./ballerina-build-last

  cd ..
  return "$retValue"
}
ballerina_run() {
  java -jar "./output/$fileNameWithoutExt.jar" "$@"
  return "$?"
}

# =============================================
#           C
# =============================================
c_compile() {
  echo "gcc \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/c-build-last
  gcc "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/c-build-last 2>&1
  retValue="$?"
  echo "-- GCC returned: $retValue" >> ./output/c-build-last
  return "$retValue"
}
c_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
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
    echo "lein uberjar" > ./clojure-build-last
    lein uberjar >> ./clojure-build-last 2>&1
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

# =============================================
#           COBOL
# =============================================
cobol_compile() {
  echo "cobc -x -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/cobol-build-last
  cobc -x -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/cobol-build-last 2>&1
  retValue="$?"
  echo "-- cobc returned: $retValue" >> ./output/cobol-build-last
  return "$retValue"
}
cobol_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           C++
# =============================================
cpp_compile() {
  echo "g++ \"./$fileName\" -o \"./output/$fileNameWithoutExt\" --std=c++23 -lstdc++exp" > ./output/cpp-build-last
  g++ "./$fileName" -o "./output/$fileNameWithoutExt" --std=c++23 -lstdc++exp >> ./output/cpp-build-last 2>&1
  retValue="$?"
  echo "-- G++ returned: $retValue" >> ./output/cpp-build-last
  return "$retValue"
}
cpp_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
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

  echo "cd ./output && echo [$fileNameWithoutExt.csproj] && dotnet build && cd .." > ./csharp-build-last
  dotnet build >> ./csharp-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./csharp-build-last
  cd ..
  return "$retValue"
}
csharp_run() {
  "./output/bin/Debug/net10.0/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           D
# =============================================
d_compile() {
  echo "dmd -od=./output -of=\"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/d-build-last
  dmd -od=./output -of="./output/$fileNameWithoutExt" "./$fileName" >> ./output/d-build-last 2>&1
  retValue="$?"
  echo "-- dmd returned: $retValue" >> ./output/d-build-last
  return "$retValue"
}
d_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Dart
# =============================================
dart_compile() {
  echo "dart compile exe \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/dart-build-last
  dart compile exe "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/dart-build-last 2>&1
  retValue="$?"
  echo "-- dart returned: $retValue" >> ./output/dart-build-last
  return "$retValue"
}
dart_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Eiffel
# =============================================
eiffel_compile() {
  retValue=0
  case "$DEREKALGOS_EIFFEL" in
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

    echo "ec -batch -config \"./$fileNameWithoutExt.ecf\" -finalize" > ./eiffel-build-last
    ec -batch -config "./$fileNameWithoutExt.ecf" -finalize >> ./eiffel-build-last 2>&1
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
  esac
  return "$retValue"
}
eiffel_run() {
  "./output/EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Elixir
# =============================================
elixir_compile() {
  echo "elixirc -o ./output/ \"./$fileName\"" > ./output/elixir-build-last
  elixirc -o ./output/ "./$fileName" >> ./output/elixir-build-last 2>&1
  retValue="$?"
  echo "-- elixirc returned: $retValue" >> ./output/elixir-build-last
  return "$retValue"
}
elixir_run() {
  elixir --erl "-pa ./output/" -e "$moduleName.main(System.argv())" -- "$@"
  return "$?"
}

# =============================================
#           Erlang
# =============================================
erlang_compile() {
  echo "erlc -o ./output/ \"./$fileName\"" > ./output/erlang-build-last
  erlc -o ./output/ "./$fileName" >> ./output/erlang-build-last 2>&1
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

# =============================================
#           Fortran
# =============================================
fortran_compile() {
  echo "gfortran \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/fortran-build-last
  gfortran "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/fortran-build-last 2>&1
  retValue="$?"
  echo "-- gfortran returned: $retValue" >> ./output/fortran-build-last
  return "$retValue"
}
fortran_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           FreeBASIC
# =============================================
freebasic_compile() {
  cp "$fileName" ./output/
  cd ./output

  echo "fbc \"./$fileName\"" > ./freebasic-build-last
  fbc "./$fileName" >> ./freebasic-build-last  2>&1
  retValue="$?"
  echo "-- fbc returned: $retValue" >> ./freebasic-build-last

  cd ..
  return "$retValue"
}
freebasic_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
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

  echo "cd ./output && echo [$fileNameWithoutExt.fsproj] && dotnet build && cd .." > ./fsharp-build-last
  dotnet build >> ./fsharp-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./fsharp-build-last
  cd ..
  return "$retValue"
}
fsharp_run() {
  "./output/bin/Debug/net10.0/$fileNameWithoutExt" "$@"
  return "$?"
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

  echo "gleam build \"$fileNameWithoutExt\"" > ./output/gleam-build-last
  cd ./output
  gleam build 2>> ./gleam-build-last
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

# =============================================
#           Go
# =============================================
go_compile() {
  echo "go build -o \"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/go-build-last
  go build -o "./output/$fileNameWithoutExt" "./$fileName" >> ./output/go-build-last 2>&1
  retValue="$?"
  echo "-- go returned: $retValue" >> ./output/go-build-last
  return "$retValue"
}
go_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Haskell
# =============================================
haskell_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ghc \"./$fileName\"" > ./haskell-build-last
  ghc "./$fileName" >> ./haskell-build-last 2>&1
  retValue="$?"
  echo "-- ghc returned: $retValue" >> ./haskell-build-last
  cd ..
  return "$retValue"
}
haskell_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
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

# =============================================
#           Icon
# =============================================
icon_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "icont \"./$fileName\"" > ./icon-build-last
  icont "./$fileName" >> ./icon-build-last 2>&1
  retValue="$?"
  echo "-- icont returned: $retValue" >> ./icon-build-last
  cd ..
  return "$retValue"
}
icon_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Idris
# =============================================
idris_compile() {
  cp "./$fileName" ./output/
  cd ./output

  echo "idris2 \"$fileName\" -o \"$fileNameWithoutExt\"" > ./idris-build-last
  idris2 "$fileName" -o "$fileNameWithoutExt" >> ./idris-build-last 2>&1
  retValue="$?"
  echo "-- idris2 returned: $retValue" >> ./idris-build-last

  cd ..
  return "$retValue"
}
idris_run() {
  "./output/build/exec/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Java
# =============================================
java_compile() {
  echo "javac \"./$fileName\" -d ./output" > ./output/java-build-last
  javac "./$fileName" -d ./output >> ./output/java-build-last 2>&1
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

# =============================================
#           Kotlin
# =============================================
kotlin_compile() {
  echo "kotlinc \"./$fileName\" -include-runtime -d \"./output/$fileNameWithoutExt.jar\"" > ./output/kotlin-build-last
  kotlinc "./$fileName" -include-runtime -d "./output/$fileNameWithoutExt.jar" >> ./output/kotlin-build-last 2>&1
  retValue="$?"
  echo "-- kotlinc returned: $retValue" >> ./output/kotlin-build-last
  return "$retValue"
}
kotlin_run() {
  java -jar "./output/$fileNameWithoutExt.jar" "$@"
  return "$?"
}

# =============================================
#           LLVM IR
# =============================================
llvmir_compile() {
  echo "clang \"./$fileName\" -O2 -Wall -o \"./output/$fileNameWithoutExt\"" > ./output/llvmir-build-last
  clang "./$fileName" -O2 -Wall -o "./output/$fileNameWithoutExt" >> ./output/llvmir-build-last 2>&1
  retValue="$?"
  echo "-- clang returned: $retValue" >> ./output/llvmir-build-last
  return "$retValue"
}
llvmir_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
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

# =============================================
#           Mercury
# =============================================
mercury_compile() {
  echo "Copying $fileName to output as .m..." > ./output/mercury-build-last
  cp "$fileName" "./output/$fileNameWithoutExt.m"
  cd ./output

  echo "cd ./output && mmc \"./$fileNameWithoutExt.m\" && cd .." >> ./mercury-build-last
  mmc "./$fileNameWithoutExt.m" >> ./mercury-build-last 2>&1
  retValue="$?"
  echo "-- mmc returned: $retValue" >> ./mercury-build-last

  cd ..
  return "$retValue"
}
mercury_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           MMIXAL
# =============================================
mmixal_compile() {
  echo "Building MMIX standard library..." > ./output/mmixal-build-last
  cd ../../../stdlib || { echo "Failed to cd into stdlib for mmixal build" >> "$start_dir/output/mmixal-build-last"; return 1; }
  ./build.sh mmix >> "$start_dir/output/mmixal-build-last" 2>&1
  retValue="$?"
  cd "$start_dir" || { echo "Failed to return to start directory: $start_dir" >> "$start_dir/output/mmixal-build-last"; return 1; }
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
  echo "cd ./output/ && mmixal \"./$fileName\" && cd .." >> ./mmixal-build-last
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

# =============================================
#           Modula-3
# =============================================
modula3_compile() {
  echo "Making and emptying output/AMD64_LINUX..." > ./output/modula3-build-last
  mkdir -p ./output/AMD64_LINUX
  rm -Rf ./output/AMD64_LINUX/* >> /dev/null
  echo "Copying file to output/AMD64_LINUX..." >> ./output/modula3-build-last
  cp "$fileName" "./output/AMD64_LINUX/$fileName"
  echo "cd ./output/ && cm3 \"$fileName\"" >> ./output/modula3-build-last
  cd ./output/
  cm3 "$fileName" >> ./modula3-build-last 2>&1
  retValue="$?"
  echo "-- cm3 returned: $retValue" >> ./modula3-build-last
  cd ..
  return "$retValue"
}
modula3_run() {
  "./output/AMD64_LINUX/prog" "$@"
  return "$?"
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
  cd ../../../stdlib || { echo "Failed to cd into stdlib for nasm build" >> "$start_dir/output/nasm-build-last"; return 1; }
  ./build.sh "$platform" >> "$start_dir/output/nasm-build-last" 2>&1
  retValue="$?"
  cd "$start_dir" || { echo "Failed to return to start directory: $start_dir" >> "$start_dir/output/nasm-build-last"; return 1; }
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
      "Windows-x64")
        echo "nasm -f win64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/nasm-build-last
        nasm -f win64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "nasm -f elf64 -o \"./output/$fileNameWithoutExt.o\" \"$fileName\"" >> ./output/nasm-build-last
        nasm -f elf64 -o "./output/$fileNameWithoutExt.o" "$fileName" >> ./output/nasm-build-last 2>&1
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
      "Windows-x64")
        echo "ld -e _start -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\" -L \"$LD_ADDITIONAL_DIRECTORY\" -lkernel32 -lshell32" >> ./output/nasm-build-last
        ld -e _start -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" -L "$LD_ADDITIONAL_DIRECTORY" -lkernel32 -lshell32 >> ./output/nasm-build-last 2>&1
        retValue="$?"
      ;;
      *)
        echo "ld -o \"./output/$fileNameWithoutExt\" \"./output/$fileNameWithoutExt.o\" \"$stdlib\"" >> ./output/nasm-build-last
        ld -o "./output/$fileNameWithoutExt" "./output/$fileNameWithoutExt.o" "$stdlib" >> ./output/nasm-build-last 2>&1
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

# =============================================
#           Nim
# =============================================
nim_compile() {
  echo "nim compile --out:\"./output/$fileNameWithoutExt\" \"./$fileName\"" > ./output/nim-build-last
  nim compile --out:"./output/$fileNameWithoutExt" "./$fileName" >> ./output/nim-build-last 2>&1
  retValue="$?"
  echo "-- nim returned: $retValue" >> ./output/nim-build-last
  return "$retValue"
}
nim_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Oberon
# =============================================
oberon_compile() {
  echo "Copying $fileName to output..." > ./output/oberon-build-last
  cp "./$fileName" ./output/
  echo "cd ./output && voc -m \"./$fileName\" && cd .." >> ./output/oberon-build-last
  cd ./output
  voc -m "$fileName" >> ./oberon-build-last 2>&1
  retValue="$?"
  echo "-- voc returned: $retValue" >> ./oberon-build-last
  cd ..
  return "$retValue"
}
oberon_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Objective-C
# =============================================
objectivec_compile() {
  echo "clang -lobjc -lgnustep-base \$(gnustep-config --objc-flags) \$(gnustep-config --objc-libs) -L/usr/local/lib  \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/objectivec-build-last
  clang -lobjc -lgnustep-base $(gnustep-config --objc-flags) $(gnustep-config --objc-libs) -L/usr/local/lib  "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/objectivec-build-last 2>&1
  retValue="$?"
  echo "-- clang returned: $retValue" >> ./output/objectivec-build-last
  return "$retValue"
}
objectivec_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Ocaml
# =============================================
ocaml_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ocamlopt -o \"./$fileNameWithoutExt\" \"./$fileName\"" > ./ocaml-build-last
  ocamlopt -o "./$fileNameWithoutExt" "./$fileName" >> ./ocaml-build-last 2>&1
  retValue="$?"
  echo "-- ocamlopt returned: $retValue" >> ./ocaml-build-last
  cd ..
  return "$retValue"
}
ocaml_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
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

# =============================================
#           Pascal
# =============================================
pascal_compile() {
  echo "Copying $fileName to output..." > ./output/pascal-build-last
  cp "./$fileName" ./output

  echo "cd ./output && fpc \"$fileName\" && cd .." >> ./output/pascal-build-last
  cd ./output
  fpc "$fileName" >> ./pascal-build-last 2>&1
  retValue="$?"
  echo "-- fpc returned: $retValue" >> ./pascal-build-last
  cd ..
  return "$retValue"
}
pascal_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Perl
# =============================================
perl_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "perl -c \"./$fileName\"" > ./perl-build-last
  perl -c "./$fileName" >> ./perl-build-last 2>&1
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

# =============================================
#           Prolog
# =============================================
prolog_compile() {
  echo "gplc \"$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/prolog-build-last
  gplc "$fileName" -o "./output/$fileNameWithoutExt" >> ./output/prolog-build-last 2>&1
  retValue="$?"
  echo "-- gplc returned: $retValue" >> ./output/prolog-build-last
  return "$retValue"
}
prolog_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Python
# =============================================
python_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "python -m py_compile \"./$fileName\"" > ./python-build-last
  python -m py_compile "./$fileName" >> ./python-build-last 2>&1
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

# =============================================
#           R
# =============================================
r_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "Rscript --vanilla -e \"parse(file='$fileName')\"" > ./r-build-last
  Rscript --vanilla -e "parse(file='$fileName')" >> ./r-build-last 2>&1
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

# =============================================
#           Ruby
# =============================================
ruby_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ruby -c \"./$fileName\"" > ./ruby-build-last
  ruby -c "./$fileName" >> ./ruby-build-last 2>&1
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

# =============================================
#           Rust
# =============================================
rust_compile() {
  echo "rustc \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/rust-build-last
  rustc "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/rust-build-last 2>&1
  retValue="$?"
  echo "-- rustc returned: $retValue" >> ./output/rust-build-last
  return "$retValue"
}
rust_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           Scala
# =============================================
scala_compile() {
  echo "cp \"./$fileName\" ./output/ && cd ./output && scala compile \"./$fileName\" && cd .." > ./output/scala-build-last
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

# =============================================
#           Scheme
# =============================================
scheme_compile() {
  scheme_compiler_name="guild"
  if command -v guild > /dev/null 2>&1; then
    echo "guild compile -o \"./output/$fileNameWithoutExt.go\" \"./$fileName\"" > ./output/scheme-build-last
    guild compile -o "./output/$fileNameWithoutExt.go" "./$fileName" >> ./output/scheme-build-last 2>&1
    retValue="$?"
  else
    scheme_compiler_name="guile"
    echo "guile -c \"(compile-file \\\"./$fileName\\\" #:output-file \\\"./output/$fileNameWithoutExt.go\\\")\"" > ./output/scheme-build-last
    guile -c "(compile-file \"./$fileName\" #:output-file \"./output/$fileNameWithoutExt.go\")" >> ./output/scheme-build-last 2>&1
    retValue="$?"
  fi
  echo "-- $scheme_compiler_name returned: $retValue" >> ./output/scheme-build-last
  return "$retValue"
}
scheme_run() {
  guile -c "(load-compiled \"./output/$fileNameWithoutExt.go\")" "$@"
  return "$?"
}

# =============================================
#           Simula
# =============================================
simula_compile() {
  echo "Copying $fileName to output..." > ./output/simula-build-last
  cp "./$fileName" ./output/
  echo "cd ./output && cim \"./$fileName\" && cd .." >> ./output/simula-build-last
  cd ./output/
  rm -f ./gcc ./g++
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GCC13NAME}" ./gcc
  ln -s "${DEREKALGOS_GCC13}${DEREKALGOS_GXX13NAME}" ./g++
  PATH="$PWD:$PATH" cim "./$fileName" >> ./simula-build-last 2>&1
  retValue="$?"
  echo "-- cim returned: $retValue" >> ./simula-build-last
  cd ..
  return "$retValue"
}
simula_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
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

# =============================================
#           Swift
# =============================================
swift_compile() {
  echo "swiftc \"./$fileName\" -o \"./output/$fileNameWithoutExt\"" > ./output/swift-build-last
  swiftc "./$fileName" -o "./output/$fileNameWithoutExt" >> ./output/swift-build-last 2>&1
  retValue="$?"
  echo "-- swiftc returned: $retValue" >> ./output/swift-build-last
  return "$retValue"
}
swift_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
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

# =============================================
#           Typescript
# =============================================
typescript_compile() {
  echo "tsc \"$fileName\" --outDir output --target esnext --skipLibCheck true --types node" > ./output/typescript-build-last
  tsc "$fileName" --outDir output --target esnext --skipLibCheck true --types node >> ./output/typescript-build-last 2>&1
  retValue="$?"
  echo "-- tsc returned: $retValue" >> ./output/typescript-build-last
  return "$retValue"
}
typescript_run() {
  node "./output/$fileNameWithoutExt.js" "$@"
  return "$?"
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

  echo "cd ./output && echo [$fileNameWithoutExt.vbproj] && dotnet build && cd .." > ./visualbasic-build-last
  dotnet build >> ./visualbasic-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./visualbasic-build-last
  cd ..
  return "$retValue"
}
visualbasic_run() {
  "./output/bin/Debug/net10.0/$fileNameWithoutExt" "$@"
  return "$?"
}

# =============================================
#           WASM (wat)
# =============================================
wat_compile() {
  echo "cp \"$fileName\" \"./output/$fileName\" && cd ./output && wat2wasm \"$fileName\" -o \"$fileNameWithoutExt.wasm\" && cd .." > ./output/wat-build-last
  cp "$fileName" "./output/$fileName"
  cd ./output
  wat2wasm "$fileName" -o "$fileNameWithoutExt.wasm" >> ./wat-build-last 2>&1
  retValue="$?"
  echo "-- wat2wasm returned: $retValue" >> ./wat-build-last
  cd ..
  return "$retValue"
}
wat_run() {
  node ../../../run-wasm.js "./output/$fileNameWithoutExt.wasm" "$@"
  return "$?"
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

# =============================================
# =============================================

# Definitions done, we start by checking for a check for the "clean"
# request.

if [ "$fileName" = "clean" ]; then
  rm -Rf ./output >> /dev/null
  cd ../../../stdlib/ || { echo "Failed to cd to stdlib directory."; exit 1; }
  ./build.sh clean
  retValue=$?
  if [ "$retValue" -ne 0 ]; then
    echo "${RED}Failed to clean stdlib. Returned $retValue.${NORMAL}"
  else
    retValue=0
  fi
  cd "$start_dir"
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

RUN_ON_DOCKER=$(printf '%s\n' "$DEREKALGOS_RUNONDOCKER" | awk -v key="$lang" '{
  for (i = 1; i <= NF; i++) {
    split($i, pair, "=")
    if (pair[1] == key) {
      print substr($i, length(key) + 2)
      exit
    }
  }
}')
if [ -n "$RUN_ON_DOCKER" ]; then
  mkdir -p ./output
  docker_log="./output/${lang}-build-last"
  echo "STARTING DOCKER RELAY BUILD..." > "$docker_log"
  echo "ROUTE: Docker image $RUN_ON_DOCKER" >> "$docker_log"

  if ! command -v docker > /dev/null 2>&1; then
    echo "Docker relay aborted: docker command not found in PATH" >> "$docker_log"
    cat "$docker_log"
    exit 127
  fi

  CURRENT_GIT_DIR=$(resolve_abs_path ../../../)
  if [ -z "$CURRENT_GIT_DIR" ] || [ ! -d "$CURRENT_GIT_DIR" ]; then
    echo "Docker relay aborted: unable to resolve repository root directory" >> "$docker_log"
    cat "$docker_log"
    exit 2
  fi
  if [ ! -f "$CURRENT_GIT_DIR/run.sh" ]; then
    echo "Docker relay aborted: missing runner script at $CURRENT_GIT_DIR/run.sh" >> "$docker_log"
    cat "$docker_log"
    exit 2
  fi
  if [ ! -r "$CURRENT_GIT_DIR/run.sh" ]; then
    echo "Docker relay aborted: runner script is not readable at $CURRENT_GIT_DIR/run.sh" >> "$docker_log"
    cat "$docker_log"
    exit 2
  fi

  echo "docker run --rm --platform linux/amd64 -v \"<repo>\":/build -w \"/build/src/$packName/$algoName/\" $RUN_ON_DOCKER sh -c 'useTimeout=\"\$1\"; shift; sh /build/run.sh \"\$@\"' sh \"$useTimeout\" \"$fileName\" <args>" >> "$docker_log"
  run_and_log_output "$docker_log" docker run --rm --platform linux/amd64 -v "$CURRENT_GIT_DIR":/build -w "/build/src/$packName/$algoName/" $RUN_ON_DOCKER sh -c 'useTimeout="$1"; DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE="$2"; DEREKALGOS_LAST_COMMAND_OUTPUT_LOG="$3"; shift 3; sh /build/run.sh "$@"' sh "$useTimeout" "1" "$last_command_output_log" "$fileName" "$@"
  retValue="$?"
  echo "-- docker returned: $retValue" >> "$docker_log"
  echo "---- DOCKER RELAY BUILD END" >> "$docker_log"
  exit "$retValue"
fi

# Now, we should check if the environment wants our language
# to run on remotely via ssh, in which case, we should go ahead
# and do that then exit.

RUN_ON_SSH=$(printf '%s\n' "$DEREKALGOS_RUNONSSH" | awk -v key="$lang" '{
  for (i = 1; i <= NF; i++) {
    split($i, pair, "=")
    if (pair[1] == key) {
      print substr($i, length(key) + 2)
      exit
    }
  }
}')
if [ -n "$RUN_ON_SSH" ]; then
  mkdir -p ./output
  ssh_log="./output/${lang}-build-last"
  echo "STARTING SSH RELAY BUILD..." > "$ssh_log"
  echo "ROUTE: SSH target $RUN_ON_SSH" >> "$ssh_log"

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

  ssh_cfg_prefix="DEREKALGOS_SSH_${RUN_ON_SSH}"
  ssh_port=$(get_env_value "${ssh_cfg_prefix}_PORT")
  ssh_user=$(get_env_value "${ssh_cfg_prefix}_USER")
  ssh_address=$(get_env_value "${ssh_cfg_prefix}_ADDRESS")
  ssh_codedir=$(get_env_value "${ssh_cfg_prefix}_CODEDIR")
  ssh_runscript=$(get_env_value "${ssh_cfg_prefix}_RUNSCRIPT")

  missing_ssh_config=0
  if [ -z "$ssh_port" ]; then
    echo "Missing SSH config: ${ssh_cfg_prefix}_PORT" >> "$ssh_log"
    missing_ssh_config=1
  fi
  if [ -z "$ssh_user" ]; then
    echo "Missing SSH config: ${ssh_cfg_prefix}_USER" >> "$ssh_log"
    missing_ssh_config=1
  fi
  if [ -z "$ssh_address" ]; then
    echo "Missing SSH config: ${ssh_cfg_prefix}_ADDRESS" >> "$ssh_log"
    missing_ssh_config=1
  fi
  if [ -z "$ssh_codedir" ]; then
    echo "Missing SSH config: ${ssh_cfg_prefix}_CODEDIR" >> "$ssh_log"
    missing_ssh_config=1
  fi
  if [ -z "$ssh_runscript" ]; then
    echo "Missing SSH config: ${ssh_cfg_prefix}_RUNSCRIPT" >> "$ssh_log"
    missing_ssh_config=1
  fi
  if [ "$missing_ssh_config" -ne 0 ]; then
    echo "SSH relay aborted: incomplete SSH target configuration for $RUN_ON_SSH" >> "$ssh_log"
    cat "$ssh_log"
    exit 2
  fi

  echo "scp -P \"$ssh_port\" \"./$fileName\" \"$ssh_user@$ssh_address:$ssh_codedir/$fileName\"" >> "$ssh_log"
  run_and_log_output "$ssh_log" scp -P "$ssh_port" "./$fileName" "$ssh_user@$ssh_address:$ssh_codedir/$fileName"
  retValue="$?"
  echo "-- scp returned: $retValue" >> "$ssh_log"
  if [ "$retValue" -ne 0 ]; then
    echo "---- SSH RELAY BUILD END" >> "$ssh_log"
    exit "$retValue"
  fi

  ToRunOnSSH="cd $(shell_quote "$ssh_codedir") && $(shell_quote "$ssh_runscript") $(shell_quote "$fileName")"
  for arg in "$@"; do
    ToRunOnSSH="$ToRunOnSSH $(shell_quote "$arg")"
  done
  echo "ssh -p \"$ssh_port\" \"$ssh_user@$ssh_address\" \"$ToRunOnSSH\"" >> "$ssh_log"
  run_and_log_output "$ssh_log" ssh -p "$ssh_port" "$ssh_user@$ssh_address" "$ToRunOnSSH"
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
      destroy_output=1
    fi
  else
    destroy_output=1
  fi
else
  destroy_output=1
fi

if [ "$destroy_output" -eq 1 ]; then
  rm -Rf ./output >> ./clean-output 2>&1
  mkdir -p ./output
  mv ./clean-output ./output/
else
  mkdir -p ./output
fi

# Finally, run the compile for the specified language,
# and if successful, run it immediately.
# if the build fails, try to output the last build output

before_compile=$(get_ms_time)
echo "STARTING COMPILE: ${lang}_compile" >> "$last_command_output_log"
run_and_log_output "$last_command_output_log" "${lang}_compile"
compile_rc="$?"
after_compile=$(get_ms_time)
final_rc="$compile_rc"
if [ -f "./output/${lang}-build-last" ]; then
  echo "---- ${lang}-build-last ----" >> "$last_command_output_log"
  cat "./output/${lang}-build-last" >> "$last_command_output_log"
  lang_log_append_ret="$?"
  if [ "$lang_log_append_ret" -ne 0 ]; then
    echo "WARNING: failed to append ./output/${lang}-build-last to $last_command_output_log (returned $lang_log_append_ret)" >&2
  fi
fi

if [ "$compile_rc" -eq 0 ]; then
  if [ ! -f "$testFile" ]; then
    echo "Build returned successful for $lang, but output file not found.
Build output:

"
    cat "./output/${lang}-build-last"
  else
    before_run=$(get_ms_time)
    echo "STARTING RUN: ${lang}_run" >> "$last_command_output_log"
    run_with_log_and_timeout "$last_command_output_log" "${lang}_run" "$@"
    run_rc="$?"
    final_rc="$run_rc"
    after_run=$(get_ms_time)

    compile_duration=$((after_compile - before_compile))
    run_duration=$((after_run - before_run))
    if [ "$time_precision_unit" = "s" ]; then
      timing_precision_note=" (second-level precision)"
    else
      timing_precision_note=
    fi

    if [ "$run_rc" -eq 0 ]; then
      printf "
    ${BLUE}Compile Time ${compile_duration}${time_precision_unit}; Run Time ${run_duration}${time_precision_unit}${timing_precision_note}; ${GREEN}Returned $run_rc${NORMAL}
"
    else
      printf "
    ${BLUE}Compile Time ${compile_duration}${time_precision_unit}; Run Time ${run_duration}${time_precision_unit}${timing_precision_note}; ${RED}Returned $run_rc${NORMAL}
"
    fi
    if [ "$run_rc" -eq 124 ]; then
      printf "${YELLOW}Return value 124 typically signals a timeout.${NORMAL}
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
exit "$final_rc"
