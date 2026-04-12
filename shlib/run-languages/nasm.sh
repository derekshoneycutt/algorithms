#! /bin/sh

nasm_compile() {
  do_link=0
  run_or_return resolve_x64_assembly_platform "NASM" "./output/nasm-build-last" "-x64-nasm" "x64nasm" || return "$?"

  run_or_return build_assembly_stdlib_and_merge_log "NASM" "./output/nasm-build-last" "$platform" "$platform_output" "nasm" || return "$?"
  stdlib="../../../stdlib/output/stdlib-${platform}.o"

  echo "Building NASM file..." >> ./output/nasm-build-last
  do_build=0
  if should_rebuild_object_for_source "./output/$fileNameWithoutExt.o"; then
    do_build=1
  fi
  if [ "$do_build" -eq 1 ]; then
    run_or_return build_x64_assembly_object_output "nasm" "./output/nasm-build-last" "$platform" || return "$?"
    do_link=1
  fi
  if should_link_executable_for_stdlib "./output/$fileNameWithoutExt" "$stdlib"; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    run_or_return link_x64_assembly_binary_output "./output/nasm-build-last" "$platform" "$stdlib" || return "$?"
  fi
  return "$retValue"
}
nasm_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
nasm_archive() {
  default_lang_archive "$1"
  nasmArchivePlatformTag=
  case "$currentPlatform" in
    "Linux"*) nasmArchivePlatformTag="Linux" ;;
    "FreeBSD"*) nasmArchivePlatformTag="FreeBSD" ;;
    "MINGW64_NT"*) nasmArchivePlatformTag="Windows" ;;
    *) nasmArchivePlatformTag= ;;
  esac
  nasmArchiveArchTag=
  case "$currentCpuArch" in
    "x86_64"|"amd64") nasmArchiveArchTag="x64" ;;
    *) nasmArchiveArchTag= ;;
  esac
  if [ -n "$nasmArchivePlatformTag" ] && [ -n "$nasmArchiveArchTag" ]; then
    targetTag="${nasmArchivePlatformTag}-${nasmArchiveArchTag}-nasm"
    add_stdlib_prebuilt_archive_or_marker "$1" "$targetTag"
  fi
}