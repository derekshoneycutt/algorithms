#! /bin/sh

# Print tool availability in a compact pass/fail list.
print_check_env_tool_status() {
  toolList="$1"
  checkEnvToolsOk=1
  for toolName in $toolList; do
    if command -v "$toolName" > /dev/null 2>&1; then
      echo "  OK   $toolName"
    else
      echo "  MISS $toolName"
      checkEnvToolsOk=0
    fi
  done
}

# Validate DEREKALGOS_RUNONDOCKER map entries.
validate_runondocker_map_entries() {
  runondockerMap="$1"
  mapOk=0

  for pair in $runondockerMap; do
    pairLang=${pair%%=*}
    pairImage=${pair#*=}

    if [ "$pairLang" = "$pair" ]; then
      echo "  invalid docker map entry (missing '='): $pair"
      mapOk=1
      continue
    fi
    if [ -z "$pairLang" ] || [ -z "$pairImage" ]; then
      echo "  invalid docker map entry (empty key/value): $pair"
      mapOk=1
      continue
    fi
    if ! is_known_runondocker_language "$pairLang"; then
      echo "  invalid docker map language key: $pairLang"
      mapOk=1
      continue
    fi
  done

  return "$mapOk"
}

# Validate DEREKALGOS_RUNONSSH map entries.
validate_runonssh_map_entries() {
  runonsshMap="$1"
  mapOk=0

  for pair in $runonsshMap; do
    pairLang=${pair%%=*}
    pairRoute=${pair#*=}

    if [ "$pairLang" = "$pair" ]; then
      echo "  invalid ssh map entry (missing '='): $pair"
      mapOk=1
      continue
    fi
    if [ -z "$pairLang" ] || [ -z "$pairRoute" ]; then
      echo "  invalid ssh map entry (empty key/value): $pair"
      mapOk=1
      continue
    fi
    if ! is_known_runondocker_language "$pairLang"; then
      echo "  invalid ssh map language key: $pairLang"
      mapOk=1
      continue
    fi
    if ! is_valid_runonssh_route "$pairRoute"; then
      echo "  invalid ssh route format for $pairLang: $pairRoute"
      mapOk=1
      continue
    fi
  done

  return "$mapOk"
}

# Print effective routing summary by language.
print_effective_route_summary() {
  nativeCount=0
  dockerCount=0
  sshCount=0

  for langKey in $(runondocker_language_list); do
    dockerImage=$(runondocker_get_image_for_lang "$useRunOnDocker" "$langKey")
    sshRoute=$(runonssh_get_route_for_lang "$useRunOnSsh" "$langKey")

    effectiveRoute="native"
    if [ -n "$dockerImage" ]; then
      effectiveRoute="docker"
      dockerCount=$((dockerCount + 1))
    elif [ -n "$sshRoute" ]; then
      effectiveRoute="ssh"
      sshCount=$((sshCount + 1))
    else
      nativeCount=$((nativeCount + 1))
    fi

    echo "  $langKey: $effectiveRoute"
  done

  echo "  totals: native=$nativeCount docker=$dockerCount ssh=$sshCount"
}

# Run read-only environment diagnostics and return 0 on success.
run_init_check_env() {
  checkEnvStatus=0

  echo "CHECK-ENV: init diagnostics"
  echo "  platform: $currentPlatform"
  echo "  timeout: $useTimeout"
  echo "  eiffel: $useEiffel"
  echo "  gcc13 path: $useGcc13"
  echo "  gcc13 name: $useGcc13Name"
  echo "  gxx13 name: $useGxx13Name"
  echo "  run-on-docker entries: $(printf '%s\n' "$useRunOnDocker" | wc -w | tr -d ' ')"
  echo "  run-on-ssh entries: $(printf '%s\n' "$useRunOnSsh" | wc -w | tr -d ' ')"

  echo "CHECK-ENV: required tools"
  print_check_env_tool_status "awk sed grep tr cut mktemp uname"
  if [ "$checkEnvToolsOk" -ne 1 ]; then
    checkEnvStatus=1
  fi

  echo "CHECK-ENV: optional tools"
  print_check_env_tool_status "docker git"

  echo "CHECK-ENV: validating DEREKALGOS_RUNONDOCKER"
  if validate_runondocker_map_entries "$useRunOnDocker"; then
    echo "  OK"
  else
    checkEnvStatus=1
  fi

  echo "CHECK-ENV: validating DEREKALGOS_RUNONSSH"
  if validate_runonssh_map_entries "$useRunOnSsh"; then
    echo "  OK"
  else
    checkEnvStatus=1
  fi

  echo "CHECK-ENV: effective route summary"
  print_effective_route_summary

  if [ "$checkEnvStatus" -eq 0 ]; then
    echo "CHECK-ENV RESULT: PASS"
    return 0
  fi

  echo "CHECK-ENV RESULT: FAIL"
  return 1
}