#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

cp "./$fileName" "./output/$fileName"
cd ./output 

idris2 $fileName -o $fileNameWithoutExt &> ./idris-build-last

if [[ -f "./build/exec/$fileNameWithoutExt" ]]; then
  "./build/exec/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE IDRIS. BUILD OUTPUT:"
  cat "./idris-build-last"
fi

cd ..
