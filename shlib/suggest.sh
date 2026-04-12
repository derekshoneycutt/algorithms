#! /bin/sh

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
