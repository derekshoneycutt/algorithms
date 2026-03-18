#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

g++ "$fileName" -o "./output/$fileNameWithoutExt" --std=c++23 &> ./output/cpp-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE C++. BUILD OUTPUT:"
  cat "./output/cpp-build-last"
fi
