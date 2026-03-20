#! /bin/bash

lang="c++"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt"
mkdir -p output

g++ "$fileName" -o "./output/$fileNameWithoutExt" --std=c++23 &> ./output/cpp-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE C++. BUILD OUTPUT:"
  cat "./output/cpp-build-last"
fi

echo "$lang" > ./output/last-lang
