#! /bin/sh

gleam_compile() {
  mkdir -p output/src
  cp "./$fileName" ./output/src/

  if [ ! -f "./output/gleam.toml" ]; then
    template_content=$(cat ../../../templates/gleam-template.toml)
    get_variabled_string "$template_content" > "./output/gleam.toml"
    template_content=$(cat ../../../templates/gleam-manifest.toml)
    get_variabled_string "$template_content" > "./output/manifest.toml"
  fi

  echo "gleam build \"$fileNameWithoutExt\"" > ./output/gleam-build-last
  cd ./output
  gleam build >> ./gleam-build-last 2>&1
  retValue="$?"
  echo "-- gleam returned: $retValue" >> ./gleam-build-last
  cd ../
  return "$retValue"
}
gleam_run() {
  cd ./output
  gleam run --no-print-progress -m "$fileNameWithoutExt" -- "$@" 2>> ./gleam-build-last
  retValue="$?"
  cd ..
  return "$retValue"
}
gleam_archive() {
  default_lang_archive "$@"
}