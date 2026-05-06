#! /bin/sh

clisp_compile() {
  retValue=0
  cp "$fileName" ./output/
  cd ./output/
  echo "sbcl --noinform --no-sysinit --no-userinit --eval \"(compile-file \\\"./$fileName\\\")\" --eval \"(quit)\"" > ./clisp-build-last
  sbcl --noinform --no-sysinit --no-userinit \
    --eval "(compile-file \"./$fileName\")" \
    --eval "(quit)" >> ./clisp-build-last 2>&1
  retValue="$?"
  echo "-- sbcl returned: $retValue" >> ./clisp-build-last
  cd ..
  return "$retValue"
}
clisp_run() {
  sbcl --noinform --no-sysinit --no-userinit \
    --load "./output/${fileNameWithoutExt}.fasl" \
    --quit "$@"
  return "$?"
}
clisp_archive() {
  default_lang_archive "$@"
}