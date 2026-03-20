#! /bin/bash

lang="idris"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/build/exec/$fileNameWithoutExt"
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
echo "$lang" > ./output/last-lang
