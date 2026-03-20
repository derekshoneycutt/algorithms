#! /bin/bash

lang="erlang"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt.beam"
mkdir -p output

erlc -o "./output/" "$fileName" &> ./output/erlang-build-last

cd ./output/

if [[ -f "./$fileNameWithoutExt.beam" ]]; then
  erl -noshell -s "$fileNameWithoutExt" main -s init stop -- $other_params
else
  echo "FAILED TO COMPILE ERLANG. BUILD OUTPUT:"
  cat "./erlang-build-last"
fi

cd ../
echo "$lang" > ./output/last-lang
