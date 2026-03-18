#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output
cp $fileName ./output/
cd ./output

fbc "$fileName" &> ./freebasic-build-last

if [[ -f "$fileNameWithoutExt" ]]; then
  "./$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE FREEBASIC. BUILD OUTPUT:"
  cat "./freebasic-build-last"
fi

cd ../
