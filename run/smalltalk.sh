#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

scp -P 2222 "$fileName" coderun@127.0.0.1:"/home/coderun/codefiles/$fileName" > /dev/null 
ssh -p 2222 coderun@127.0.0.1 ./compile-run-smalltalk.sh "$fileName" $other_params
