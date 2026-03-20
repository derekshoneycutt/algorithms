#! /bin/bash

lang="c"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt"
mkdir -p ./output

gcc "$fileName" -o "./output/$fileNameWithoutExt" &> ./output/c-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE C. BUILD OUTPUT:"
  cat "./output/c-build-last"
fi

echo "$lang" > ./output/last-lang
