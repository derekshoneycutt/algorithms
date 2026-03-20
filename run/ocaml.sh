#! /bin/bash

fileName=$1
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi

ocaml "$fileName" $other_params
