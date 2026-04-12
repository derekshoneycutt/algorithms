#! /bin/sh

fsharp_compile() {
  if [ ! -f "./output/$fileName" ]; then
    cp "./$fileName" ./output/
  elif [ -n "$(find "./$fileName" -prune -newer "./output/$fileName" 2>/dev/null)" ]; then
    cp "./$fileName" ./output/
  fi
  cd ./output

  if [ ! -f "$fileNameWithoutExt.fsproj" ]; then
    template_content=$(cat ../../../../templates/template.fsproj)
    get_variabled_string "$template_content" > "$fileNameWithoutExt.fsproj"
  fi

  echo "cd ./output" > ./fsharp-build-last
  echo "echo [$fileNameWithoutExt.fsproj]" >> ./fsharp-build-last
  echo "dotnet build --verbosity:detailed" >> ./fsharp-build-last
  echo "cd .." >> ./fsharp-build-last
  dotnet build --verbosity:detailed >> ./fsharp-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./fsharp-build-last
  cd ..
  return "$retValue"
}
fsharp_run() {
  "./output/bin/Debug/net10.0/$fileNameWithoutExt" "$@"
  return "$?"
}
fsharp_archive() {
  default_lang_archive "$@"
}