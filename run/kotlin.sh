#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt.jar"
mkdir -p output

kotlinc "$fileName" -include-runtime -d "./output/$fileNameWithoutExt.jar" &> ./output/kotlin-build-last

if [[ -f "./output/$fileNameWithoutExt.jar" ]]; then
  java -jar "./output/$fileNameWithoutExt.jar" $other_params
else
  echo "FAILED TO COMPILE KOTLIN. BUILD OUTPUT:"
  cat "./output/kotlin-build-last"
fi

echo "$lang" > ./output/last-lang
