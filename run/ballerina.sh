#! /bin/bash

lang="ballerina"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt.jar"
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
echo "$lang" > ./output/last-lang
