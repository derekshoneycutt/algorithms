#! /bin/sh

# Create temp files safely even without mktemp by using noclobber retries.
make_temp_file_secure() {
  tempLabel="$1"
  tempBaseDir="$2"
  if [ -z "$tempBaseDir" ]; then
    tempBaseDir="${TMPDIR:-/tmp}"
  fi

  if command -v mktemp > /dev/null 2>&1; then
    mktemp "${tempBaseDir%/}/derekalgos-${tempLabel}.XXXXXX"
    return "$?"
  fi

  tempIdx=0
  tempMaxTries=128
  while [ "$tempIdx" -lt "$tempMaxTries" ]; do
    tempCandidate="${tempBaseDir%/}/derekalgos-${tempLabel}.$$.$tempIdx"
    ( set -C; : > "$tempCandidate" ) 2>/dev/null && {
      printf '%s\n' "$tempCandidate"
      return 0
    }
    tempIdx=$((tempIdx + 1))
  done

  return 1
}

# Pick the default shell profile used by this project for a platform.
determine_profile_for_platform() {
  platformValue="$1"
  if [ -z "$platformValue" ]; then
    if [ -n "$currentPlatform" ]; then
      platformValue="$currentPlatform"
    else
      platformValue=$(uname -s)
    fi
  fi

  case "$platformValue" in
    "MINGW64_NT"*) printf '%s\n' ~/.bash_profile ;;
    "Linux"*) printf '%s\n' ~/.bash_profile ;;
    "FreeBSD") printf '%s\n' ~/.profile ;;
    "Darwin") printf '%s\n' ~/.zprofile ;;
    *) printf '%s\n' "" ;;
  esac
}
