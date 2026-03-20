#! /bin/bash

lang="simula"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2} # maybe we'll figure it out later? IDK man

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt.jar"
mkdir -p output

simula -noexec "./$fileName" -output output &> ./output/simula-build-last

if [[ -f "./output/$fileNameWithoutExt.jar" ]]; then
  java -jar "./output/$fileNameWithoutExt.jar" $fileName -noPopup 
else
  echo "FAILED TO COMPILE SIMULA. BUILD OUTPUT:"
  cat "./output/simula-build-last"
fi

echo "$lang" > ./output/last-lang
