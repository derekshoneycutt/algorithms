#! /bin/sh

# Parse and validate one run-on-ssh route in either supported format:
#   legacy:   ssh-destination|code-dir|run-script
#   explicit: ssh-address|ssh-user|ssh-port|code-dir|run-script
# On success, exports parsed values via runonsshRoute* globals.
validate_and_parse_runonssh_route() {
  runonsshInputRoute="$1"

  runonsshRouteFormat=
  runonsshRouteDestination=
  runonsshRouteAddress=
  runonsshRouteUser=
  runonsshRoutePort=
  runonsshRouteCodeDir=
  runonsshRouteRunScript=

  if [ -z "$runonsshInputRoute" ]; then
    return 1
  fi

  runonsshFieldCount=$(printf '%s' "$runonsshInputRoute" | awk -F'|' '{print NF}')
  case "$runonsshFieldCount" in
    3)
      runonsshRouteFormat="legacy"
      runonsshRouteDestination=${runonsshInputRoute%%|*}
      runonsshRouteRest=${runonsshInputRoute#*|}
      runonsshRouteCodeDir=${runonsshRouteRest%%|*}
      runonsshRouteRunScript=${runonsshRouteRest#*|}

      if [ -z "$runonsshRouteDestination" ] || [ -z "$runonsshRouteCodeDir" ] || [ -z "$runonsshRouteRunScript" ]; then
        return 1
      fi
      ;;
    5)
      runonsshRouteFormat="explicit"
      runonsshRouteAddress=${runonsshInputRoute%%|*}
      runonsshRouteRest=${runonsshInputRoute#*|}
      runonsshRouteUser=${runonsshRouteRest%%|*}
      runonsshRouteRest=${runonsshRouteRest#*|}
      runonsshRoutePort=${runonsshRouteRest%%|*}
      runonsshRouteRest=${runonsshRouteRest#*|}
      runonsshRouteCodeDir=${runonsshRouteRest%%|*}
      runonsshRouteRunScript=${runonsshRouteRest#*|}

      if [ -z "$runonsshRouteAddress" ] || [ -z "$runonsshRouteUser" ] || [ -z "$runonsshRoutePort" ] || [ -z "$runonsshRouteCodeDir" ] || [ -z "$runonsshRouteRunScript" ]; then
        return 1
      fi
      case "$runonsshRoutePort" in
        *[!0-9]*|'') return 1 ;;
      esac
      runonsshRouteDestination="$runonsshRouteUser@$runonsshRouteAddress"
      ;;
    *)
      return 1
      ;;
  esac

  return 0
}