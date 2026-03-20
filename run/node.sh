#! /bin/bash

fileName=$1
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi

node "$fileName" $other_params
