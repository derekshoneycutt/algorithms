#! /bin/sh

mojo_compile() {
  retValue=0
  if [ ! -f "./output/pixi.toml" ]; then
    template_content=$(cat ../../../templates/pixi.lock)
    get_variabled_string "$template_content" > "./output/pixi.lock"
    template_content=$(cat ../../../templates/pixi.toml)
    get_variabled_string "$template_content" > "./output/pixi.toml"

    echo "Attempting to ensure mojo is added..." > ./output/mojo-build-last
    cd ./output
    pixi add mojo >> ./mojo-build-last 2>&1
    retValue="$?"
    echo "-- pixi returned: $retValue" >> ./mojo-build-last
    cd ..
  else
    echo "pixi.toml exists in output, skipping setup..." > ./output/mojo-build-last
  fi

  cp -f "./$fileName" ./output/
  retValue="$?"
  return "$retValue"
}
mojo_run() {
  cd ./output
  pixi run mojo run "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
mojo_archive() {
  default_lang_archive "$@"
}