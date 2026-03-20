#! /bin/bash

lang="freebasic"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt"
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
echo "$lang" > ./output/last-lang
