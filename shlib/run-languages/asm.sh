#! /bin/sh

asm_compile() {
  do_link=0
  run_or_return resolve_x64_assembly_platform "Assembly" "./output/asm-build-last" "-x64" "x64" || return "$?"

  run_or_return build_assembly_stdlib_and_merge_log "Assembly" "./output/asm-build-last" "$platform" "$platform_output" "asm" || return "$?"
  stdlib="../../../stdlib/output/stdlib-${platform}.o"

  echo "Building Assembly file..." >> ./output/asm-build-last
  do_build=0
  if should_rebuild_object_for_source "./output/$fileNameWithoutExt.o"; then
    do_build=1
  fi
  if [ "$do_build" -eq 1 ]; then
    run_or_return build_x64_assembly_object_output "asm" "./output/asm-build-last" "$platform" || return "$?"
    do_link=1
  fi
  if should_link_executable_for_stdlib "./output/$fileNameWithoutExt" "$stdlib"; then
    do_link=1
  fi
  if [ "$do_link" -eq 1 ]; then
    run_or_return link_x64_assembly_binary_output "./output/asm-build-last" "$platform" "$stdlib" || return "$?"
  fi
  return "$retValue"
}
asm_run() {
  "./output/$fileNameWithoutExt" "$@"
  return "$?"
}
asm_archive() {
  default_lang_archive "$1"
  asmArchivePlatformTag=
  case "$currentPlatform" in
    "Linux"*) asmArchivePlatformTag="Linux" ;;
    "FreeBSD"*) asmArchivePlatformTag="FreeBSD" ;;
    "MINGW64_NT"*) asmArchivePlatformTag="Windows" ;;
    *) asmArchivePlatformTag= ;;
  esac
  asmArchiveArchTag=
  case "$currentCpuArch" in
    "x86_64"|"amd64") asmArchiveArchTag="x64" ;;
    *) asmArchiveArchTag= ;;
  esac
  if [ -n "$asmArchivePlatformTag" ] && [ -n "$asmArchiveArchTag" ]; then
    tag="${asmArchivePlatformTag}-${asmArchiveArchTag}"
    add_stdlib_prebuilt_archive_or_marker "$1" "$tag"
  fi
}