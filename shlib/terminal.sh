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
