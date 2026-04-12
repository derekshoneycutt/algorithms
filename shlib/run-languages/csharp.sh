#! /bin/sh

csharp_compile() {
  if [ ! -f "./output/$fileName" ]; then
    cp "./$fileName" ./output/
  elif [ -n "$(find "./$fileName" -prune -newer "./output/$fileName" 2>/dev/null)" ]; then
    cp "./$fileName" ./output/
  fi
  cd ./output

  if [ ! -f "$fileNameWithoutExt.csproj" ]; then
    template_content=$(cat ../../../../templates/template.csproj)
    get_variabled_string "$template_content" > "$fileNameWithoutExt.csproj"
  fi

  echo "cd ./output" > ./csharp-build-last
  echo "echo [$fileNameWithoutExt.csproj]" >> ./csharp-build-last
  echo "dotnet build --verbosity:detailed" >> ./csharp-build-last
  echo "cd .." >> ./csharp-build-last
  dotnet build --verbosity:detailed >> ./csharp-build-last 2>&1
  retValue="$?"
  echo "-- dotnet build returned: $retValue" >> ./csharp-build-last
  cd ..
  return "$retValue"
}
csharp_run() {
  "./output/bin/Debug/net10.0/$fileNameWithoutExt" "$@"
  return "$?"
}
csharp_archive() {
  default_lang_archive "$@"
}