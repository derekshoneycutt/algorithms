#! /bin/sh

php_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "php -l \"./$fileName\"" > ./php-build-last
  php -l "./$fileName" >> ./php-build-last 2>&1
  retValue="$?"
  echo "-- php returned: $retValue" >> ./php-build-last
  cd ..
  return "$retValue"
}
php_run() {
  cd ./output
  php "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
php_archive() {
  default_lang_archive "$@"
}