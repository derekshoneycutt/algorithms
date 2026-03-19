#! /bin/bash

# This is here because it is used to run forth on a VM. This is
# in the VM, and is run via SSH to compile and launch an forth file.

fileName=$1
fileNameWithoutExtension="${fileName%.*}"
other_params=${@:2}

cd /home/coderun/codefiles

gforth "./$fileName" -- $other_params

cd ..
rm -Rf ./codefiles/* > /dev/null
