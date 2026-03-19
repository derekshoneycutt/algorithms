#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

cp "$fileName" "./output/$fileNameWithoutExt.m"
cd ./output

octave "$fileNameWithoutExt.m" $other_params

cd ..
