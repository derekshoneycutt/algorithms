#! /bin/bash

lang="ada"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt"
mkdir -p ./output

gnatmake -q -D output -o "./output/$fileNameWithoutExt" "$fileName" &> ./output/ada-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  ./output/$fileNameWithoutExt $other_params
else
  echo "FAILED TO COMPILE ADA. BUILD OUTPUT:"
  cat "./output/ada-build-last"
fi

echo "$lang" > ./output/last-lang
