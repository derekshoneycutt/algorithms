#! /bin/sh

# Print supported option keys for did-you-mean matching.
# Args:
#   $1: script kind (run|init)
print_option_catalog_for_script() {
  case "$1" in
    run)
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
--smoke-test
--help
-h
--help-all
--help=
EOF
      ;;
    init)
      cat <<'EOF'
--interactive
--no-prompt
--set-use-only
--copy-icons
--no-icons
--icons-to=
--update-environment
--skip-environment
--update-profile=
--build-docker
--check-only
--check-env
--runondocker
--runonssh
--runondocker-set=
--runonssh-set=
--runondocker-remove=
--runonssh-remove=
--help
-h
--help-all
--help=
--use-timeout=
--use-eiffel=
--use-gcc13=
--use-gcc13name=
--use-gxx13name=
--use-runondocker=
--use-runonssh=
EOF
      ;;
    *)
      return 1
      ;;
  esac
}

# Print supported help topics for did-you-mean matching.
# Args:
#   $1: script kind (run|init)
print_help_topic_catalog_for_script() {
  case "$1" in
    run)
      cat <<'EOF'
examples
profile
execution
general
clean
EOF
      ;;
    init)
      cat <<'EOF'
examples
prompt
set-use-only
env
runondocker
runonssh
EOF
      ;;
    *)
      return 1
      ;;
  esac
}
