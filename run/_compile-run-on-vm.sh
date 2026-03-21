#! /bin/bash

# This is here because it is used to run code on a VM. This is
# in the VM, and is run via SSH to compile and launch a file.

shopt -s extglob

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib

fileName=$1
fileNameWithoutExt="${fileName%.*}"
fileExtension="${fileName##*.}"
other_params=${@:2}
lang=
testFile=
outputFile=
destroy_output=0

function forth_compile() { :; }
function forth_run() {
  timeout -k 10s 1m gforth "./$fileName" -- $other_params
}

function modula3_compile() {
  mkdir -p AMD64_LINUX
  rm -Rf ./AMD64_LINUX/* >> /dev/null
  mv $fileName ./AMD64_LINUX/$fileName
  timeout -k 10s 1m /home/coderun/cm3/bin/cm3 $fileName &> "$outputFile"
}
function modula3_run() {
  timeout -k 10s 1m "$testFile" $other_params
}

function oberon_compile() {
  timeout -k 10s 1m /opt/voc/bin/voc -m "./$fileName" &> "$outputFile"
}
function oberon_run() {
  timeout -k 10s 1m "./$fileNameWithoutExt" $other_params
}

function simula_compile() {
  timeout -k 10s 1m cim "./$fileName" &> "$outputFile"
}
function simula_run() {
  timeout -k 10s 1m "./$fileNameWithoutExt" $other_params
}

function smalltalk_compile() { :; }
function smalltalk_run() {
  timeout -k 10s 1m gst "./$fileName" $other_params
}

cd /home/coderun/codefiles

if [ "$fileName" == "clean" ]; then
  cd ..
  rm -Rf ./codefiles/* >> /dev/null
  shopt -u extglob
  exit
fi

case "$fileExtension" in
  "fth")
    lang="forth"
    testFile="./$fileName"
    outputFile="./$fileName"
    outputFile="/home/coderun/compile-out/forth-output-last"
    ;;
  "m3")
    lang="modula3"
    testFile="/home/coderun/codefiles/AMD64_LINUX/prog"
    outputFile="/home/coderun/compile-out/cm3-output-last"
    ;;
  "Mod")
    lang="oberon"
    testFile="./$fileNameWithoutExt"
    outputFile="/home/coderun/compile-out/voc-output-last"
    ;;
  "sim")
    lang="simula"
    testFile="./$fileNameWithoutExt"
    outputFile="/home/coderun/compile-out/cim-output-last"
    ;;
  "st")
    lang="smalltalk"
    testFile="./$fileName"
    outputFile="./$fileName"
    outputFile="/home/coderun/compile-out/smalltalk-output-last"
    ;;
  *)
    echo "Unrecognized file extension, not building!"
    shopt -u extglob
    exit
    ;;
esac

if [[ -f "./last-lang" ]]; then
  if cmp -s "./last-lang" - <<< "$lang"; then
    if [ "./$fileName" -nt "$testFile" ]; then
      destroy_output=1
    fi
  else
    destroy_output=1
  fi
else
  destroy_output=1
fi

if [ "$destroy_output" -eq 1 ]; then
  rm -Rf !("$fileName") >> /dev/null
fi

"${lang}_compile"

if [[ -f "$testFile" ]]; then
  "${lang}_run"
  echo "$lang" > ./last-lang
else
  echo "FAILED TO COMPILE ${lang^^}. BUILD OUTPUT:"
  cat $outputFile
fi

cd ..
shopt -u extglob
