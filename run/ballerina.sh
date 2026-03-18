#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output
cp $fileName ./output/
cd ./output

bal build $fileName &> ./ballerina-build-last

if [[ -f "$fileNameWithoutExt.jar" ]]; then
  java -jar "$fileNameWithoutExt.jar" $other_params
else
  echo "FAILED TO COMPILE BALLERINA. BUILD OUTPUT:"
  cat "./ballerina-build-last"
fi

cd ../
