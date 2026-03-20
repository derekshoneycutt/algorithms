#! /bin/bash

lang="octave"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt.m"
mkdir -p output

cp "$fileName" "./output/$fileNameWithoutExt.m"
cd ./output

octave "$fileNameWithoutExt.m" $other_params

cd ..
echo "$lang" > ./output/last-lang
