#!/bin/sh
set -eu

# Locate repository root from this script location.
scriptDir=$(CDPATH= cd -- "$(dirname "$0")" && pwd -P)
repoRoot=$(CDPATH= cd -- "$scriptDir/.." && pwd -P)
. "$scriptDir/terminal.sh" || {
  echo "ERROR: unable to load terminal helpers from $scriptDir/terminal.sh" >&2
  exit 78
}

# CLI options.
targetDir=""
langsOverride=""
defaultTimeout="8m"
slowTimeout="20m"
markdownReportPath=""

supportsInteractiveStatus=0
terminalCols=80
ansiReset=""
ansiGreen=""
ansiYellow=""
ansiRed=""
ansiBlue=""
ansiBold=""

if [ -t 1 ]; then
  supportsInteractiveStatus=1
  terminalCols=$(get_display_columns)
fi

init_terminal_style_sequences
if [ -n "$termStyleReset" ]; then
  ansiReset="$termStyleReset"
  ansiGreen="$termColorGreen"
  ansiYellow="$termColorYellow"
  ansiRed="$termColorRed"
  ansiBlue="$termColorBlue"
  ansiBold="$termStyleBold"
fi

render_smoke_status_line() {
  renderIndex="$1"
  renderTotal="$2"
  renderLang="$3"
  renderTimeout="$4"
  renderStatus="$5"
  renderStatusColor="$6"

  renderLeft="SMOKE [$renderIndex/$renderTotal] lang=$renderLang timeout=$renderTimeout"

  if [ "$supportsInteractiveStatus" -eq 1 ]; then
    leftLen=${#renderLeft}
    statusLen=$(( ${#renderStatus} + 2 ))
    spacing=$((terminalCols - leftLen - statusLen - 1))
    if [ "$spacing" -lt 1 ]; then
      spacing=1
    fi
    printf '\r%s%*s%s[%s%s%s%s%s]%s' \
      "$renderLeft" "$spacing" "" \
      "$ansiBlue" \
      "$renderStatusColor" "$ansiBold" "$renderStatus" "$ansiReset" "$ansiBlue" \
      "$ansiReset"
  else
    printf '%s [%s]\n' "$renderLeft" "$renderStatus"
  fi
}

printUsage() {
  cat <<'EOF'
Usage:
  shlib/run-smoke-test.sh [--dir=<algorithm-dir>] [--langs="lang1 lang2"] [--timeout=<dur>] [--slow-timeout=<dur>] [--markdown[=<path>]]

Examples:
  shlib/run-smoke-test.sh --dir=src/numeric/euclidgcd
  shlib/run-smoke-test.sh --dir=src/numeric/euclidgcd --langs="c cpp rust"
  shlib/run-smoke-test.sh --dir=src/numeric/euclidgcd --timeout=8m --slow-timeout=20m
  shlib/run-smoke-test.sh --dir=src/numeric/euclidgcd --markdown
  shlib/run-smoke-test.sh --dir=src/numeric/euclidgcd --markdown=SmokeTest.md

Notes:
  - If --dir is omitted, current directory is used.
  - Report is written to <repo>/output/smoke-work/<pack>-<algo>-<timestamp>/
  - Per-language logs are written to that same smoke-work directory.
  - Archive is written to <repo>/archive/smoke/smoke-<pack>-<algo>-<timestamp>.tar.gz
  - <repo>/archive/last-smoke.tar.gz points to the newest smoke archive.
  - --markdown writes a Markdown summary report (default: <repo>/SmokeTest.md)
EOF
}

for rawArg in "$@"; do
  case "$rawArg" in
    --help|-h)
      printUsage
      exit 0
      ;;
    --dir=*)
      targetDir=${rawArg#--dir=}
      ;;
    --langs=*)
      langsOverride=${rawArg#--langs=}
      ;;
    --timeout=*)
      defaultTimeout=${rawArg#--timeout=}
      ;;
    --slow-timeout=*)
      slowTimeout=${rawArg#--slow-timeout=}
      ;;
    --markdown)
      markdownReportPath="$repoRoot/SmokeTest.md"
      ;;
    --markdown=*)
      markdownArg=${rawArg#--markdown=}
      if [ -z "$markdownArg" ]; then
        echo "Invalid --markdown value: path cannot be empty" >&2
        exit 64
      fi
      case "$markdownArg" in
        /*) markdownReportPath=$markdownArg ;;
        *) markdownReportPath="$repoRoot/$markdownArg" ;;
      esac
      ;;
    *)
      echo "Unknown argument: $rawArg" >&2
      printUsage >&2
      exit 64
      ;;
  esac
done

# Resolve algorithm directory.
if [ -z "$targetDir" ]; then
  algoDir=$PWD
else
  case "$targetDir" in
    /*) algoDir=$targetDir ;;
    *) algoDir=$repoRoot/$targetDir ;;
  esac
fi

if [ ! -d "$algoDir" ]; then
  echo "Algorithm directory not found: $algoDir" >&2
  exit 2
fi

if [ ! -f "$repoRoot/run.sh" ]; then
  echo "run.sh not found at repo root: $repoRoot/run.sh" >&2
  exit 2
fi

packName=$(basename "$(dirname "$algoDir")")
algoName=$(basename "$algoDir")
algoRel="${algoDir#"$repoRoot"/}"

timestamp=$(date +%s)
outputDir="$algoDir/output"
smokeWorkDir="$repoRoot/output/smoke-work/${packName}-${algoName}-${timestamp}"
smokeLogDir="$smokeWorkDir/smoke-last"
reportFile="$smokeWorkDir/smoke-report-${algoName}-${timestamp}.txt"

# Start fresh smoke output directory for this run.
mkdir -p "$outputDir"
rm -rf "$smokeWorkDir"
mkdir -p "$smokeLogDir"

if [ -n "$langsOverride" ]; then
  langs=$langsOverride
else
  # Source generated language defaults so smoke follows the canonical default set.
  . "$repoRoot/shlib/generated/languages.generated.sh"
  if [ -n "${GENERATED_SMOKE_DEFAULT_KEYS:-}" ]; then
    langs=$GENERATED_SMOKE_DEFAULT_KEYS
  else
    langs=$(get_generated_supported_language_keys | grep -v '^arm64asm$' | tr '\n' ' ')
  fi
fi

set -- $langs
totalLangs=$#
if [ "$totalLangs" -eq 0 ]; then
  echo "Smoke test aborted: no languages selected." >&2
  exit 64
fi

echo "SMOKE START: target=$algoRel languages=$totalLangs"
echo "SMOKE WORKDIR: $smokeWorkDir"

printf 'lang|exit|build_log|archive_last|archive_output_path|archive_source_path|archive_build_success|note\n' > "$reportFile"

cd "$algoDir"
currentIndex=0
for lang in $langs; do
  currentIndex=$((currentIndex + 1))
  note=""
  buildLogStatus="missing"
  archiveLastStatus="missing"
  archiveOutputStatus="missing"
  archiveSourceStatus="missing"
  archiveBuildSuccessStatus="missing"

  langLogFile="$smokeLogDir/${lang}.out"

  timeoutArg=$defaultTimeout
  case "$lang" in
    mojo|ballerina|acton)
      timeoutArg=$slowTimeout
      ;;
    *) ;;
  esac

  render_smoke_status_line "$currentIndex" "$totalLangs" "$lang" "$timeoutArg" "RUNNING" "$ansiYellow"

  # Run one language build/run and keep a dedicated per-language smoke log.
  # Keep run.sh's internal timeout in sync with this smoke timeout so the
  # inner timeout layer does not terminate runs early (default is often 2m).
  effectiveRunTimeout="-k 10s ${timeoutArg}"
  if command -v timeout > /dev/null 2>&1; then
    set +e
    DEREKALGOS_TIMEOUT="$effectiveRunTimeout" \
      timeout --preserve-status "$timeoutArg" "$repoRoot/run.sh" "$lang" > "$langLogFile" 2>&1
    rc=$?
    set -e
  else
    set +e
    DEREKALGOS_TIMEOUT="$effectiveRunTimeout" \
      "$repoRoot/run.sh" "$lang" > "$langLogFile" 2>&1
    rc=$?
    set -e
  fi

  if [ -f "./output/${lang}-build-last" ]; then
    if [ -s "./output/${lang}-build-last" ]; then
      buildLogStatus="ok"
    else
      buildLogStatus="empty"
    fi
  fi

  if [ -f "$repoRoot/archive/last-build.tar.gz" ]; then
    archiveLastStatus="ok"
    if tar -tzf "$repoRoot/archive/last-build.tar.gz" | grep -q "^${algoRel}/output/"; then
      archiveOutputStatus="ok"
    fi

    if [ -f ./output/last-command-output.log ]; then
      srcFile=$(awk -F': ' '/^file: /{print $2; exit}' ./output/last-command-output.log 2>/dev/null)
      if [ -n "${srcFile:-}" ]; then
        if tar -tzf "$repoRoot/archive/last-build.tar.gz" | grep -q "^${algoRel}/${srcFile}$"; then
          archiveSourceStatus="ok"
        else
          note="source-not-in-archive:${srcFile}"
        fi
      else
        note="missing-last-command-file"
      fi
    else
      note="missing-last-command-log"
    fi

    # Validate the archived language build log includes a success return marker.
    archivedBuildLogPath="${algoRel}/output/${lang}-build-last"
    if tar -tzf "$repoRoot/archive/last-build.tar.gz" | grep -q "^${archivedBuildLogPath}$"; then
      if tar -xOzf "$repoRoot/archive/last-build.tar.gz" "$archivedBuildLogPath" 2>/dev/null | grep -Eq 'returned: 0'; then
        archiveBuildSuccessStatus="ok"
      else
        archiveBuildSuccessStatus="fail"
        if [ -z "$note" ]; then
          note="archive-build-success-marker-missing"
        fi
      fi
    else
      archiveBuildSuccessStatus="missing"
      if [ -z "$note" ]; then
        note="archive-build-log-missing:${lang}-build-last"
      fi
    fi
  fi

  if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
    note="timeout"
  elif [ "$rc" -ne 0 ] && [ -z "$note" ]; then
    note="run-failed"
  fi

  printf '%s|%s|%s|%s|%s|%s|%s|%s\n' "$lang" "$rc" "$buildLogStatus" "$archiveLastStatus" "$archiveOutputStatus" "$archiveSourceStatus" "$archiveBuildSuccessStatus" "$note" >> "$reportFile"

  if [ "$rc" -eq 0 ]; then
    render_smoke_status_line "$currentIndex" "$totalLangs" "$lang" "$timeoutArg" "PASS" "$ansiGreen"
  else
    case "$note" in
      timeout)
        render_smoke_status_line "$currentIndex" "$totalLangs" "$lang" "$timeoutArg" "TIMEOUT" "$ansiYellow"
        ;;
      *)
        render_smoke_status_line "$currentIndex" "$totalLangs" "$lang" "$timeoutArg" "FAIL" "$ansiRed"
        ;;
    esac
  fi

  if [ "$supportsInteractiveStatus" -eq 1 ]; then
    printf '\n'
  fi
done

# Archive the smoke report and per-language logs, and refresh the stable pointer.
archiveDir="$repoRoot/archive"
smokeArchiveDir="$archiveDir/smoke"
mkdir -p "$smokeArchiveDir"

archiveName="smoke-${packName}-${algoName}-${timestamp}.tar.gz"
archivePath="$smokeArchiveDir/$archiveName"

tar -czf "$archivePath" -C "$smokeWorkDir" "$(basename "$reportFile")" "$(basename "$smokeLogDir")"
ln -sfn "smoke/$archiveName" "$archiveDir/last-smoke.tar.gz"

summaryStats=$(awk -F'|' 'NR==1{next} {total++; if($2==0) pass++; else fail++; if($7!="ok") badArchiveBuildSuccess++; if($8!="") noted++} END{printf("%d %d %d %d %d",total,pass,fail,badArchiveBuildSuccess,noted)}' "$reportFile")
set -- $summaryStats
summaryTotal="$1"
summaryPass="$2"
summaryFail="$3"
summaryBadArchiveBuildSuccess="$4"
summaryNoted="$5"
summaryLine="Total=$summaryTotal Pass=$summaryPass Fail=$summaryFail badArchiveBuildSuccess=$summaryBadArchiveBuildSuccess noted=$summaryNoted"

if [ -n "$markdownReportPath" ]; then
  markdownDir=$(dirname "$markdownReportPath")
  mkdir -p "$markdownDir"

  totalCount=$(awk -F'|' 'NR==1{next} {total++} END{print total+0}' "$reportFile")
  passCount=$(awk -F'|' 'NR==1{next} $2==0 {pass++} END{print pass+0}' "$reportFile")
  failCount=$(awk -F'|' 'NR==1{next} $2!=0 {fail++} END{print fail+0}' "$reportFile")
  badBuildCount=$(awk -F'|' 'NR==1{next} $3!="ok" {c++} END{print c+0}' "$reportFile")
  badArchiveLastCount=$(awk -F'|' 'NR==1{next} $4!="ok" {c++} END{print c+0}' "$reportFile")
  badArchiveOutputCount=$(awk -F'|' 'NR==1{next} $5!="ok" {c++} END{print c+0}' "$reportFile")
  badArchiveSourceCount=$(awk -F'|' 'NR==1{next} $6!="ok" {c++} END{print c+0}' "$reportFile")
  badArchiveBuildSuccessCount=$(awk -F'|' 'NR==1{next} $7!="ok" {c++} END{print c+0}' "$reportFile")
  noteCount=$(awk -F'|' 'NR==1{next} $8!="" {c++} END{print c+0}' "$reportFile")

  cat > "$markdownReportPath" <<EOF
# Smoke Test Report

Date: $(date +%Y-%m-%d)
Target: ${algoRel}
Runner: shlib/run-smoke-test.sh

## Summary

- total languages: ${totalCount}
- pass: ${passCount}
- fail: ${failCount}
- build log issues: ${badBuildCount}
- archive last-build issues: ${badArchiveLastCount}
- archive output-path issues: ${badArchiveOutputCount}
- archive source-path issues: ${badArchiveSourceCount}
- archive build-success marker issues: ${badArchiveBuildSuccessCount}
- note entries: ${noteCount}

## Artifacts

- Report file: ${reportFile}
- Per-language logs: ${smokeLogDir}
- Smoke archive: ${archivePath}
- Last smoke symlink: ${archiveDir}/last-smoke.tar.gz

## Archive Validation Included In This Run

Each language row validated:
- run exit code
- existence/non-empty status of ./output/<lang>-build-last
- existence of archive/last-build.tar.gz
- inclusion of algorithm output path in archive/last-build.tar.gz
- inclusion of source file path from output/last-command-output.log in archive/last-build.tar.gz
- inclusion of archived output/<lang>-build-last success marker (returned: 0)

## Result

Smoke test run completed.
EOF
fi

echo "SMOKE COMPLETE"
if [ "$supportsInteractiveStatus" -eq 1 ]; then
  printf '%s%sTotal%s=%s%d%s %s%sPass%s=%s%d%s %s%sFail%s=%s%d%s badArchiveBuildSuccess=%d noted=%d\n' \
    "$ansiBlue" "$ansiBold" "$ansiReset" "$ansiBlue" "$summaryTotal" "$ansiReset" \
    "$ansiGreen" "$ansiBold" "$ansiReset" "$ansiGreen" "$summaryPass" "$ansiReset" \
    "$ansiRed" "$ansiBold" "$ansiReset" "$ansiRed" "$summaryFail" "$ansiReset" \
    "$summaryBadArchiveBuildSuccess" "$summaryNoted"
else
  echo "$summaryLine"
fi
echo "REPORT=$reportFile"
echo "LOGDIR=$smokeLogDir"
echo "ARCHIVE=$archivePath"
echo "LAST_SMOKE=$archiveDir/last-smoke.tar.gz"
if [ -n "$markdownReportPath" ]; then
  echo "MARKDOWN=$markdownReportPath"
fi
