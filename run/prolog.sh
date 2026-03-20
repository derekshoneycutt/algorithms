#! /bin/bash

lang="prolog"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt"
mkdir -p output

gplc "$fileName" -o "./output/$fileNameWithoutExt" &> ./output/prolog-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE PROLOG. BUILD OUTPUT:"
  cat "./output/prolog-build-last"
fi

echo "$lang" > ./output/last-lang
