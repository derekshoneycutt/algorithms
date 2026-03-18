#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

gfortran $fileName -o "./output/$fileNameWithoutExt" &> ./output/fortran-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE FORTRAN. BUILD OUTPUT:"
  cat "./output/fortran-build-last"
fi
