#! /bin/bash

fileName=$1
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi

scp -P 2222 "$fileName" coderun@127.0.0.1:"/home/coderun/codefiles/$fileName" > /dev/null 
ssh -p 2222 coderun@127.0.0.1 ./compile-run-smalltalk.sh "$fileName" $other_params
