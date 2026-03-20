#! /bin/bash

lang="cobol"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt"
mkdir -p output

cobc -x -o "./output/$fileNameWithoutExt" "$fileName" &> ./output/cobol-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE COBOL. BUILD OUTPUT:"
  cat "./output/cobol-build-last"
fi

echo "$lang" > ./output/last-lang
