#! /bin/sh

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

# Initialize terminal style globals with tput+ANSI fallback.
# Colors are enabled when:
#   - stdout is a TTY, or
#   - execution route indicates relay child mode (docker-relay/ssh-relay), or
#   - DEREKALGOS_FORCE_COLOR is set to always/1/true.
# Exports globals:
#   termStyleReset, termStyleBold
#   termColorBlue, termColorYellow, termColorGreen, termColorRed
init_terminal_style_sequences() {
  termStyleReset=""
  termStyleBold=""
  termColorBlue=""
  termColorYellow=""
  termColorGreen=""
  termColorRed=""

  enableTermStyles=0
  if [ -t 1 ]; then
    enableTermStyles=1
  fi
  case "${DEREKALGOS_EXECUTION_ROUTE:-}" in
    docker-relay|ssh-relay) enableTermStyles=1 ;;
  esac
  case "${DEREKALGOS_FORCE_COLOR:-}" in
    always|1|true|TRUE|yes|YES) enableTermStyles=1 ;;
  esac

  if [ "$enableTermStyles" -ne 1 ]; then
    return 0
  fi

  if command -v tput > /dev/null 2>&1; then
    termStyleReset=$(tput sgr0 2>/dev/null || echo "")
    termStyleBold=$(tput bold 2>/dev/null || echo "")
    termColorBlue=$(tput setaf 4 2>/dev/null || echo "")
    termColorYellow=$(tput setaf 3 2>/dev/null || echo "")
    termColorGreen=$(tput setaf 2 2>/dev/null || echo "")
    termColorRed=$(tput setaf 1 2>/dev/null || echo "")
  fi

  if [ -z "$termStyleReset" ] || [ -z "$termStyleBold" ] || [ -z "$termColorBlue" ] || [ -z "$termColorYellow" ] || [ -z "$termColorGreen" ] || [ -z "$termColorRed" ]; then
    termStyleReset=$(printf '\033[0m')
    termStyleBold=$(printf '\033[1m')
    termColorBlue=$(printf '\033[0;34m')
    termColorYellow=$(printf '\033[0;33m')
    termColorGreen=$(printf '\033[0;32m')
    termColorRed=$(printf '\033[0;31m')
  fi

  return 0
}
