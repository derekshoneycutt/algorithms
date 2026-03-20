#! /bin/bash

lang="scala"
fileName=$1
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileName"
mkdir -p ./output
cp "$fileName" ./output/

if [ "$#" -lt 2 ]; then
    other_params="15 10"
fi

cd ./output

scala run "$fileName" -- $other_params

cd ..
echo "$lang" > ./output/last-lang
