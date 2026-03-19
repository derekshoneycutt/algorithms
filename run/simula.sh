#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2} # maybe we'll figure it out later? IDK man

mkdir -p output

simula -noexec "./$fileName" -output output &> ./output/simula-build-last

if [[ -f "./output/$fileNameWithoutExt.jar" ]]; then
  java -jar "./output/$fileNameWithoutExt.jar" $fileName -noPopup 
else
  echo "FAILED TO COMPILE SIMULA. BUILD OUTPUT:"
  cat "./output/simula-build-last"
fi
