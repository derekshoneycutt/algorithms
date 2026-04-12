#! /bin/sh

visualbasic_compile() {
  if [ ! -f "./output/$fileName" ]; then
    cp "./$fileName" ./output/
  elif [ -n "$(find "./$fileName" -prune -newer "./output/$fileName" 2>/dev/null)" ]; then
    cp "./$fileName" ./output/
  fi
  cd ./output

  if [ ! -f "$fileNameWithoutExt.vbproj" ]; then
    template_content=$(cat ../../../../templates/template.vbproj)
    get_variabled_string "$template_content" > "$fileNameWithoutExt.vbproj"
  fi

  echo "cd ./output" > ./visualbasic-build-last
  echo "echo [$fileNameWithoutExt.vbproj]" >> ./visualbasic-build-last
  echo "dotnet build --verbosity:detailed" >> ./visualbasic-build-last
  echo "cd .." >> ./visualbasic-build-last
  dotnet build --verbosity:detailed >> ./visualbasic-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./visualbasic-build-last
  cd ..
  return "$retValue"
}
visualbasic_run() {
  "./output/bin/Debug/net10.0/$fileNameWithoutExt" "$@"
  return "$?"
}
visualbasic_archive() {
  default_lang_archive "$@"
}