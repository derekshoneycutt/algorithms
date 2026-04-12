#! /bin/sh

lua_compile() {
  echo "luac -o \"./output/$fileNameWithoutExt.luac\" \"./$fileName\"" > ./output/lua-build-last
  luac -o "./output/$fileNameWithoutExt.luac" "./$fileName" >> ./output/lua-build-last 2>&1
  retValue="$?"
  echo "-- luac returned: $retValue" >> ./output/lua-build-last
  return "$retValue"
}
lua_run() {
  lua "./output/$fileNameWithoutExt.luac" "$@"
  return "$?"
}
lua_archive() {
  default_lang_archive "$@"
}