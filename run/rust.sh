#! /bin/bash

lang="rust"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt"
mkdir -p output

rustc "$fileName" -o "./output/$fileNameWithoutExt" &> ./output/rust-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE RUST. BUILD OUTPUT:"
  cat "./output/rust-build-last"
fi

echo "$lang" > ./output/last-lang
