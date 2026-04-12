#! /bin/sh

octave_compile() {
  # We copy over to the output directory and rename the file with a "shaved" suffix
  # this prevents overlaps that can happen with our algorithms and Octave's
  # standard library, to some degree. It's the only language that needs this.
  cp "./$fileName" "./output/${fileNameWithoutExt}shaved.m"
  return "$?"
}
octave_run() {
  cd ./output
  octave --quiet "${fileNameWithoutExt}shaved.m" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
octave_archive() {
  default_lang_archive "$@"
}