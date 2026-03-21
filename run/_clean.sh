#! /bin/bash

lang=$1
testFile=$2
destroy_output=0

if [ "$fileName" == "force" ]; then
  destroy_output=1
else
  if [[ -f "./output/last-lang" ]]; then
    if cmp -s "./output/last-lang" - <<< "$lang"; then
      if [ "$fileName" -nt $testFile ]; then
        destroy_output=1
      fi
    else
      destroy_output=1
    fi
  else
    destroy_output=1
  fi
fi

if [ "$destroy_output" -eq 1 ]; then
  rm -Rf ./output
fi
