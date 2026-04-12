#! /bin/sh

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

  if ! validate_and_parse_runonssh_route "$ssh_target_def"; then
    return 1
  fi

  ssh_destination="$runonsshRouteDestination"
  ssh_address="$runonsshRouteAddress"
  ssh_user="$runonsshRouteUser"
  ssh_port="$runonsshRoutePort"
  ssh_codedir="$runonsshRouteCodeDir"
  ssh_runscript="$runonsshRouteRunScript"

  return 0
}

# Quote one argument so it is safe in POSIX sh commands.
shell_quote() {
  # Return a single shell token safe for POSIX sh parsing.
  quoted=$(printf '%s' "$1" | sed "s/'/'\\''/g")
  printf "'%s'" "$quoted"
}

# Run a command, stream its output, and append output to logs.
run_and_log_output() {
  relay_log_file="$1"
  shift
  (
    relay_tmp_file=$(make_temp_file_secure "relay" "${TMPDIR:-/tmp}") || {
      echo "ERROR: unable to create relay temp file" >&2
      exit 1
    }

    trap 'rm -f "$relay_tmp_file"' INT TERM HUP EXIT

    "$@" > "$relay_tmp_file" 2>&1 &
    relay_cmd_pid="$!"

    relay_phase_watcher_pid=""
    if [ -n "${RUN_AND_LOG_PHASE_MARKER:-}" ] && [ -n "${RUN_AND_LOG_PHASE_SWITCH_TEXT:-}" ]; then
      (
        while kill -0 "$relay_cmd_pid" 2>/dev/null; do
          if [ -f "$RUN_AND_LOG_PHASE_MARKER" ]; then
            printf '\033[1A\033[2K'
            printf "%s\n" "$RUN_AND_LOG_PHASE_SWITCH_TEXT"
            break
          fi
          sleep 0.1
        done
      ) &
      relay_phase_watcher_pid="$!"
    fi

    wait "$relay_cmd_pid"
    relay_ret="$?"

    if [ -n "$relay_phase_watcher_pid" ]; then
      kill "$relay_phase_watcher_pid" 2>/dev/null
      wait "$relay_phase_watcher_pid" 2>/dev/null
    fi

    flush_output_to_logs "$relay_tmp_file" "$relay_log_file" "relay output"

    exit "$relay_ret"
  )
  return "$?"
}

# Print captured output and append it to main and shared logs.
flush_output_to_logs() {
  flush_tmp_file="$1"
  flush_log_file="$2"
  flush_label="$3"

  # Optional status-line cleanup (for buffered relay runs like docker).
  case "${RUN_AND_LOG_CLEAR_STATUS_LINE:-}" in
    1) printf '\033[1A\033[2K' ;;
  esac

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

# Resolve one transport route considering check-only forcing rules.
resolve_relay_route_for_check_only() {
  relay_transport="$1"
  relay_route="$2"

  if [ "$checkOnlyMode" -eq 1 ]; then
    case "$relay_transport:$checkOnlyRoute" in
      docker:native|docker:ssh)
        relay_route=""
        ;;
      docker:docker)
        if [ -z "$relay_route" ]; then
          relay_route="check-only-docker"
        fi
        ;;
      ssh:native|ssh:docker)
        relay_route=""
        ;;
      ssh:ssh)
        if [ -z "$relay_route" ]; then
          relay_route="check-only-ssh"
        fi
        ;;
    esac
  fi

  printf '%s\n' "$relay_route"
}

# Append docker relay diagnostics into shared output log when docker relay fails.
append_docker_relay_fallback_log() {
  docker_fallback_log="$1"
  if [ -z "$lastCommandOutputLog" ] || [ ! -f "$docker_fallback_log" ]; then
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
    cat "$docker_fallback_log"
  } >> "$lastCommandOutputLog"
}

# Execute docker relay path and exit with docker relay result.
run_docker_relay_or_exit() {
  ensure_output_dir_permissions
  docker_log="./output/${lang}-build-last"
  dockerCompileDoneMarker="./output/.derekalgos-phase-compile-done"
  rm -f "$dockerCompileDoneMarker"
  echo "STARTING DOCKER RELAY BUILD..." > "$docker_log"
  echo "Compiling on Docker..." >> "$docker_log"
  dockerStatusShown=0
  dockerStatusCompileLine="Compiling on Docker..."
  dockerStatusRunLine="Executing on Docker..."
  if [ -n "$termColorBlue" ]; then
    dockerStatusCompileLine="${termColorBlue}${termStyleBold}Compiling on Docker...${termStyleReset}"
    dockerStatusRunLine="${termColorBlue}${termStyleBold}Executing on Docker...${termStyleReset}"
    printf "%s\n" "$dockerStatusCompileLine"
    dockerStatusShown=1
  elif [ -t 1 ]; then
    printf "%s\n" "$dockerStatusCompileLine"
    dockerStatusShown=1
  fi
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

  if ! command -v docker > /dev/null 2>&1; then
    echo "Docker relay aborted: docker command not found in PATH" >> "$docker_log"
    append_docker_relay_fallback_log "$docker_log"
    cat "$docker_log"
    exit 127
  fi

  CURRENT_GIT_DIR=$(resolve_abs_path ../../../)
  if [ -z "$CURRENT_GIT_DIR" ] || [ ! -d "$CURRENT_GIT_DIR" ]; then
    echo "Docker relay aborted: unable to resolve repository root directory" >> "$docker_log"
    append_docker_relay_fallback_log "$docker_log"
    cat "$docker_log"
    exit 2
  fi
  if [ ! -f "$CURRENT_GIT_DIR/run.sh" ]; then
    echo "Docker relay aborted: missing runner script at $CURRENT_GIT_DIR/run.sh" >> "$docker_log"
    append_docker_relay_fallback_log "$docker_log"
    cat "$docker_log"
    exit 2
  fi
  if [ ! -r "$CURRENT_GIT_DIR/run.sh" ]; then
    echo "Docker relay aborted: runner script is not readable at $CURRENT_GIT_DIR/run.sh" >> "$docker_log"
    append_docker_relay_fallback_log "$docker_log"
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

  docker_inner_sh='if [ -n "$1" ]; then DEREKALGOS_TIMEOUT="$1"; export DEREKALGOS_TIMEOUT; fi; DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE="$2"; DEREKALGOS_LAST_COMMAND_OUTPUT_LOG="$3"; DEREKALGOS_EXECUTION_ROUTE="$4"; DEREKALGOS_HOST_CWD="$5"; DEREKALGOS_HOST_CPUARCH="$6"; DEREKALGOS_HOST_PLATFORM="$7"; DEREKALGOS_HOST_TRANSLATION="$8"; export DEREKALGOS_LAST_COMMAND_OUTPUT_ACTIVE DEREKALGOS_LAST_COMMAND_OUTPUT_LOG DEREKALGOS_EXECUTION_ROUTE DEREKALGOS_HOST_CWD DEREKALGOS_HOST_CPUARCH DEREKALGOS_HOST_PLATFORM DEREKALGOS_HOST_TRANSLATION; shift 8; sh /build/run.sh "$@"'

  if [ "$checkOnlyMode" -eq 1 ]; then
    echo "RUN_AND_LOG: docker relay -> /build/run.sh --check-only $fileName <args>" >> "$docker_log"
    RUN_AND_LOG_CLEAR_STATUS_LINE="$dockerStatusShown" \
    RUN_AND_LOG_PHASE_MARKER="$dockerCompileDoneMarker" \
    RUN_AND_LOG_PHASE_SWITCH_TEXT="$dockerStatusRunLine" \
    RUN_AND_LOG_SKIP_SHARED_APPEND=1 \
      run_and_log_output "$docker_log" \
        docker run --rm --platform linux/amd64 \
        -v "$CURRENT_GIT_DIR":/build \
        -w "/build/src/$packName/$algoName/" \
        $runOnDocker sh -c "$docker_inner_sh" \
        sh "$docker_timeout_arg" "" "$lastCommandOutputLog" "docker-relay" \
        "$startDir" "$hostCpuArch" "$hostPlatform" "$hostTranslation" \
        --check-only "$fileName" "$@"
  elif [ "$compileOnlyMode" -eq 1 ]; then
    echo "RUN_AND_LOG: docker relay -> /build/run.sh --compile-only $fileName <args>" >> "$docker_log"
    RUN_AND_LOG_CLEAR_STATUS_LINE="$dockerStatusShown" \
    RUN_AND_LOG_PHASE_MARKER="$dockerCompileDoneMarker" \
    RUN_AND_LOG_PHASE_SWITCH_TEXT="$dockerStatusRunLine" \
    RUN_AND_LOG_SKIP_SHARED_APPEND=1 \
      run_and_log_output "$docker_log" \
        docker run --rm --platform linux/amd64 \
        -v "$CURRENT_GIT_DIR":/build \
        -w "/build/src/$packName/$algoName/" \
        $runOnDocker sh -c "$docker_inner_sh" \
        sh "$docker_timeout_arg" "" "$lastCommandOutputLog" "docker-relay" \
        "$startDir" "$hostCpuArch" "$hostPlatform" "$hostTranslation" \
        --compile-only "$fileName" "$@"
  else
    echo "RUN_AND_LOG: docker relay -> /build/run.sh $fileName <args>" >> "$docker_log"
    RUN_AND_LOG_CLEAR_STATUS_LINE="$dockerStatusShown" \
    RUN_AND_LOG_PHASE_MARKER="$dockerCompileDoneMarker" \
    RUN_AND_LOG_PHASE_SWITCH_TEXT="$dockerStatusRunLine" \
    RUN_AND_LOG_SKIP_SHARED_APPEND=1 \
      run_and_log_output "$docker_log" \
        docker run --rm --platform linux/amd64 \
        -v "$CURRENT_GIT_DIR":/build \
        -w "/build/src/$packName/$algoName/" \
        $runOnDocker sh -c "$docker_inner_sh" \
        sh "$docker_timeout_arg" "" "$lastCommandOutputLog" "docker-relay" \
        "$startDir" "$hostCpuArch" "$hostPlatform" "$hostTranslation" \
        "$fileName" "$@"
  fi
  retValue="$?"
  rm -f "$dockerCompileDoneMarker"
  echo "-- docker returned: $retValue" >> "$docker_log"
  echo "---- DOCKER RELAY BUILD END" >> "$docker_log"

  if [ "$retValue" -ne 0 ] && [ -n "$lastCommandOutputLog" ] && [ -f "$docker_log" ]; then
    append_docker_relay_fallback_log "$docker_log"
  fi

  exit "$retValue"
}

# Execute ssh relay path and exit with ssh relay result.
run_ssh_relay_or_exit() {
  ensure_output_dir_permissions
  ssh_log="./output/${lang}-build-last"

  echo "STARTING SSH RELAY BUILD..." > "$ssh_log"
  echo "Compiling and executing on SSH..." >> "$ssh_log"
  sshStatusShown=0
  if [ -n "$termColorBlue" ]; then
    printf "${termColorBlue}${termStyleBold}Compiling and executing on SSH...${termStyleReset}\n"
    sshStatusShown=1
  elif [ -t 1 ]; then
    printf "Compiling and executing on SSH...\n"
    sshStatusShown=1
  fi
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
    RUN_AND_LOG_CLEAR_STATUS_LINE="$sshStatusShown" run_and_log_output "$ssh_log" scp -P "$ssh_port" "./$fileName" "$ssh_destination:$ssh_codedir/$fileName"
  else
    echo "scp \"./$fileName\" \"$ssh_destination:$ssh_codedir/$fileName\"" >> "$ssh_log"
    RUN_AND_LOG_CLEAR_STATUS_LINE="$sshStatusShown" run_and_log_output "$ssh_log" scp "./$fileName" "$ssh_destination:$ssh_codedir/$fileName"
  fi
  sshStatusShown=0
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
}

# Resolve relay routes and execute the selected relay path when configured.
run_selected_relay_or_continue() {
  runOnDocker=$(get_lang_route_value "$DEREKALGOS_RUNONDOCKER" "$lang")
  runOnDocker=$(resolve_relay_route_for_check_only docker "$runOnDocker")
  if [ -n "$runOnDocker" ]; then
    run_docker_relay_or_exit "$@"
  fi

  runOnSsh=$(get_lang_route_value "$DEREKALGOS_RUNONSSH" "$lang")
  runOnSsh=$(resolve_relay_route_for_check_only ssh "$runOnSsh")
  if [ -n "$runOnSsh" ]; then
    run_ssh_relay_or_exit "$@"
  fi

  return 0
}