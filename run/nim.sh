#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

nim compile --out:"output/$fileNameWithoutExt" --verbosity:0 --hints:off --run "$fileName" $other_params
