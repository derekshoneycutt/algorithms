#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

cobc -x -o "./output/$fileNameWithoutExt" "$fileName" &> ./output/cobol-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE COBOL. BUILD OUTPUT:"
  cat "./output/cobol-build-last"
fi
