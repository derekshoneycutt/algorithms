#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output
cp "$fileName" "./output/$fileNameWithoutExt.m"
cd ./output

mmc "$fileNameWithoutExt.m" &> ./mercury-build-last

if [[ -f "./$fileNameWithoutExt" ]]; then
  "./$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE MERCURY. BUILD OUTPUT:"
  cat "./mercury-build-last"
fi

cd ..
