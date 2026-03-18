#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

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
