#! /bin/bash

fileName=$1
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi

nim compile --out:"output/$fileNameWithoutExt" --verbosity:0 --hints:off --run "$fileName" $other_params
