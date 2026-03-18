#! /bin/bash

fileName=$1
fileNameWithoutExtension="${fileName%.*}"
other_params=${@:2}

cd /home/coderun/codefiles

rm -f $fileNameWithoutExtension

voc -m $fileName > ./voc-output-last

if [[ -f "$fileNameWithoutExtension" ]]; then
  "./$fileNameWithoutExtension" $other_params
else
  echo "FAILED TO COMPILE OBERON. BUILD OUTPUT:"
  cat ./voc-output-last
fi
