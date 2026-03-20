#! /bin/bash

lang="java"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}
dir="${PWD%/*}"
packName="${dir##*/}"
algoName="${PWD##*/}"

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$packName/$algoName/$fileNameWithoutExt.class"
mkdir -p output

javac "$fileName" -d ./output &> ./output/java-build-last

cd ./output

if [[ -f "./$packName/$algoName/$fileNameWithoutExt.class" ]]; then
  java "${packName}.${algoName}.$fileNameWithoutExt" -- $other_params
else
  echo "FAILED TO COMPILE JAVA. BUILD OUTPUT:"
  cat "./java-build-last"
fi

cd ..
echo "$lang" > ./output/last-lang
