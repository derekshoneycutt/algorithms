#! /bin/sh

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

  run_or_return build_assembly_stdlib_and_merge_log "Assembly" "./output/arm64asm-build-last" "$platform" "$platform_output" "arm64asm" || return "$?"
  stdlib="../../../stdlib/output/stdlib-${platform}.o"

  echo "Building Assembly file..." >> ./output/arm64asm-build-last
  do_build=0
  if should_rebuild_object_for_source "./output/$fileNameWithoutExt.o"; then
    do_build=1
  fi
  if [ "$do_build" -eq 1 ]; then
    run_or_return build_arm64_assembly_object_output "./output/arm64asm-build-last" || return "$?"
    do_link=1
  fi
  if should_link_executable_for_stdlib "./output/$fileNameWithoutExt" "$stdlib"; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    run_or_return link_arm64_assembly_binary_output "./output/arm64asm-build-last" "$stdlib" || return "$?"
  fi
  return "$retValue"
}
arm64asm_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
arm64asm_archive() {
  default_lang_archive "$1"
  arm64asmTag="Darwin-arm64"
  case "$currentPlatform" in
    "Darwin"*) arm64asmTag="Darwin-arm64" ;;
    *) arm64asmTag="" ;;
  esac
  if [ -n "$arm64asmTag" ]; then
    add_stdlib_prebuilt_archive_or_marker "$1" "$arm64asmTag"
  fi
}