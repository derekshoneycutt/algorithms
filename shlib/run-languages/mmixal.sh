#! /bin/sh

mmixal_compile() {
  echo "Building MMIX standard library..." > ./output/mmixal-build-last
  cd ../../../stdlib || { echo "Failed to cd into stdlib for mmixal build" >> "$startDir/output/mmixal-build-last"; return 1; }
  ./build.sh mmix >> "$startDir/output/mmixal-build-last" 2>&1
  retValue="$?"
  cd "$startDir" || { echo "Failed to return to start directory: $startDir" >> "$startDir/output/mmixal-build-last"; return 1; }
  if [ $retValue -ne 0 ]; then
    return $retValue
  fi

  stdlib_mms="../../../stdlib/output/stdlib.mms"
  combined_source="./output/$fileName"
  do_refresh_combined=0

  if [ ! -f "$stdlib_mms" ]; then
    echo "Missing MMIX standard library output: $stdlib_mms" >> ./output/mmixal-build-last
    return 1
  fi

  if [ ! -f "$combined_source" ]; then
    do_refresh_combined=1
    echo "Combined MMIX source missing; creating $combined_source" >> ./output/mmixal-build-last
  elif [ -n "$(find "./$fileName" -prune -newer "$combined_source" 2>/dev/null)" ]; then
    do_refresh_combined=1
    echo "Source file changed; refreshing combined MMIX source" >> ./output/mmixal-build-last
  elif [ -n "$(find "$stdlib_mms" -prune -newer "$combined_source" 2>/dev/null)" ]; then
    do_refresh_combined=1
    echo "MMIX stdlib changed; refreshing combined MMIX source" >> ./output/mmixal-build-last
  else
    echo "Combined MMIX source is up-to-date; reusing $combined_source" >> ./output/mmixal-build-last
  fi

  if [ "$do_refresh_combined" -eq 1 ]; then
    echo "Copying source: cp \"./$fileName\" \"$combined_source\"" >> ./output/mmixal-build-last
    cp "./$fileName" "$combined_source" >> ./output/mmixal-build-last 2>&1
    retValue="$?"
    echo "-- cp returned: $retValue" >> ./output/mmixal-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi

    echo "Combining stdlib: cat \"$stdlib_mms\" >> \"$combined_source\"" >> ./output/mmixal-build-last
    cat "$stdlib_mms" >> "$combined_source" 2>> ./output/mmixal-build-last
    retValue="$?"
    echo "-- cat returned: $retValue" >> ./output/mmixal-build-last
    if [ "$retValue" -ne 0 ]; then
      return $retValue
    fi
  fi

  if [ ! -s "$combined_source" ]; then
    echo "Combined MMIX source missing or empty: $combined_source" >> ./output/mmixal-build-last
    return 1
  fi

  cd ./output
  echo "cd ./output" >> ./mmixal-build-last
  echo "mmixal \"./$fileName\"" >> ./mmixal-build-last
  echo "cd .." >> ./mmixal-build-last
  mmixal "./$fileName" >> ./mmixal-build-last 2>&1
  retValue="$?"
  echo "-- mmixal returned: $retValue" >> ./mmixal-build-last
  cd ..
  return "$retValue"
}
mmixal_run() {
  cd ./output
  mmix "./$fileNameWithoutExt.mmo" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
mmixal_archive() {
  default_lang_archive "$1"
  add_stdlib_prebuilt_archive_or_marker "$1" "mmix"
}