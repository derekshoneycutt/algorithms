#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output
cp "$fileName" ./output
cd ./output

fpc "$fileName" &> ./pascal-build-last

if [[ -f "./$fileNameWithoutExt" ]]; then
  "./$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE PASCAL. BUILD OUTPUT:"
  cat "./pascal-build-last"
fi

cd ..
