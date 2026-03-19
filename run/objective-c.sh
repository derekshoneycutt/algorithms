#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output

clang -lobjc -lgnustep-base `gnustep-config --objc-flags` `gnustep-config --objc-libs` -L/usr/local/lib  "$fileName" -o "./output/$fileNameWithoutExt" &> ./output/objc-build-last

if [[ -f "./output/$fileNameWithoutExt" ]]; then
  "./output/$fileNameWithoutExt" $other_params
else
  echo "FAILED TO COMPILE OBJECTIVE-C. BUILD OUTPUT:"
  cat "./output/objc-build-last"
fi
