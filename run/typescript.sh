#! /bin/bash

lang="typescript"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt.js"
mkdir -p output

tsc "$fileName" --outDir output --target esnext --skipLibCheck true &> ./output/ts-build-last

if [[ -f "./output/$fileNameWithoutExt.js" ]]; then
  node ./output/$fileNameWithoutExt.js $other_params
else
  echo "FAILED TO COMPILE TypeScript. BUILD OUTPUT:"
  cat "./output/ts-build-last"
fi

echo "$lang" > ./output/last-lang
