#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

javac "$fileName" -d ./output &> ./output/java-build-last

dir="${PWD%/*}"
packName="${dir##*/}"
algoName="${PWD##*/}"

cd ./output

if [[ -f "./$packName/$algoName/$fileNameWithoutExt.class" ]]; then
  java "${packName}.${algoName}.$fileNameWithoutExt" -- $other_params
else
  echo "FAILED TO COMPILE JAVA. BUILD OUTPUT:"
  cat "./java-build-last"
fi

cd ..
