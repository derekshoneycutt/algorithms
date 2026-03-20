#! /bin/bash

lang="mercury"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt"
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
echo "$lang" > ./output/last-lang
