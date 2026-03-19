#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

if [ "$#" -lt 2 ]; then
    other_params="15 10"
fi

scala run "$fileName" -- $other_params
