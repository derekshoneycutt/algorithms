#! /bin/bash

lang="fortran"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt"
mkdir -p output

gfortran $fileName -o "./output/$fileNameWithoutExt" &> ./output/fortran-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE FORTRAN. BUILD OUTPUT:"
  cat "./output/fortran-build-last"
fi

echo "$lang" > ./output/last-lang
