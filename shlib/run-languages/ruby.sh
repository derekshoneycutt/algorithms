#! /bin/sh

ruby_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "ruby -w -c \"./$fileName\"" > ./ruby-build-last
  ruby -w -c "./$fileName" >> ./ruby-build-last 2>&1
  retValue="$?"
  echo "-- ruby returned: $retValue" >> ./ruby-build-last
  cd ..
  return "$retValue"
}
ruby_run() {
  cd ./output
  ruby "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
ruby_archive() {
  default_lang_archive "$@"
}