#! /bin/bash

# This is here because it is used to run Oberon on a VM. This is
# in the VM, and is run via SSH to compile and launch an Oberon file.

fileName=$1
fileNameWithoutExtension="${fileName%.*}"
other_params=${@:2}

cd /home/coderun/codefiles

rm -f "$fileNameWithoutExtension"

voc -m "$fileName" > ./voc-output-last

if [[ -f "$fileNameWithoutExtension" ]]; then
  "./$fileNameWithoutExtension" $other_params
else
  echo "FAILED TO COMPILE OBERON. BUILD OUTPUT:"
  cat ./voc-output-last
fi

cd ..
rm -Rf ./codefiles/* > /dev/null
