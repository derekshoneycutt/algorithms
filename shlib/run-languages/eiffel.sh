#! /bin/sh

eiffel_compile() {
  retValue=0
  eiffel_compiler=$(printf '%s' "$DEREKALGOS_EIFFEL" | tr '[:upper:]' '[:lower:]')
  case "$eiffel_compiler" in
  "eiffelstudio")
    new_uuid=$(uuidgen)

    cp "./$fileName" ./output/
    cp ./eiffel_include/*.e ./output/ >> /dev/null 2>&1
    cd ./output/

    if [ ! -f "$fileNameWithoutExt.ecf" ]; then
      template_content=$(cat ../../../../templates/eiffel.ecf)
      get_variabled_string "$template_content" > "./$fileNameWithoutExt.ecf"
    fi

    echo "ec -batch -verbose -config \"./$fileNameWithoutExt.ecf\" -finalize" > ./eiffel-build-last
    ec -batch -verbose -config "./$fileNameWithoutExt.ecf" -finalize >> ./eiffel-build-last 2>&1
    retValue="$?"
    echo "-- ec returned: $retValue" >> ./eiffel-build-last
    cd ..
    if [ "$retValue" -ne 0 ]; then
     return $retValue
    fi

    cd "./output/EIFGENs/$fileNameWithoutExt/F_code"
    echo "

===========================================================================
FIRST COMPILE FINISHED. CALLING finish_freezing in EIFGENs/$fileNameWithoutExt/F_code
===========================================================================

" >> "../../../eiffel-build-last"
    finish_freezing >> "../../../eiffel-build-last"
    retValue="$?"
    echo "-- finish_freezing returned: $retValue" >> ../../../eiffel-build-last

    cd ../../../../
  ;;
  "libertyeiffel")
    cp "./$fileName" ./output/
    cp ./eiffel_include/*.e ./output/ >> /dev/null 2>&1
    mkdir -p "./output/EIFGENs/$fileNameWithoutExt/F_code"
    cd ./output/

    echo "se compile \"$fileName\" -o \"./$fileNameWithoutExt\"" > ./eiffel-build-last
    se compile "$fileName" -o "EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt" >> ./eiffel-build-last 2>&1
    retValue="$?"
    echo "-- se compile returned: $retValue" >> ./eiffel-build-last

    cd ..
  ;;
  *)
    mkdir -p ./output
    echo "Unsupported DEREKALGOS_EIFFEL value: $DEREKALGOS_EIFFEL" > ./output/eiffel-build-last
    echo "Accepted values (case-insensitive): eiffelstudio, libertyeiffel" >> ./output/eiffel-build-last
    retValue=64
  ;;
  esac
  return "$retValue"
}
eiffel_run() {
  "./output/EIFGENs/$fileNameWithoutExt/F_code/$fileNameWithoutExt" "$@"
  return "$?"
}
eiffel_archive() {
  default_lang_archive "$@"

  for eiffelIncludeFile in "$startDir"/eiffel_include/*.e; do
    [ -f "$eiffelIncludeFile" ] || continue
    eiffelIncludeBase=$(basename "$eiffelIncludeFile")
    if [ -n "$startDirFromRepo" ]; then
      add_archive_input_if_exists "$1" "$startDirFromRepo/eiffel_include/$eiffelIncludeBase"
    else
      add_archive_input_if_exists "$1" "eiffel_include/$eiffelIncludeBase"
    fi
  done
}