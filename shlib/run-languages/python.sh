#! /bin/sh

python_compile() {
  cp "./$fileName" ./output/
  cd ./output
  echo "PYTHONVERBOSE=2 python -m py_compile \"./$fileName\"" > ./python-build-last
  PYTHONVERBOSE=2 python -m py_compile "./$fileName" >> ./python-build-last 2>&1
  retValue="$?"
  echo "-- python returned: $retValue" >> ./python-build-last
  cd ..
  return "$retValue"
}
python_run() {
  cd ./output
  python -u "./$fileName" "$@"
  retValue="$?"
  cd ..
  return "$retValue"
}
python_archive() {
  default_lang_archive "$@"
}