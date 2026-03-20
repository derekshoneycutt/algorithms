#! /bin/bash

readonly LINK_MMS_FILES=(
    "../../../../stdlib/ParseNumber/ParseNumber.mms"
    "../../../../stdlib/PrintNumber/PrintNumber.mms"
    "../../../../stdlib/PrintString/PrintString.mms"
    "../../../../stdlib/StringIsInt/StringIsInt.mms"
    "../../../../stdlib/StringLength/StringLength.mms")

lang="mmixal"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/$fileNameWithoutExt.mmo"
mkdir -p output
cp "$fileName" ./output/
cd ./output/

for link_file in "${LINK_MMS_FILES[@]}"; do
    cat "$link_file" >> "./$fileName"
done

mmixal "./$fileName" &> ./mmixal-build-last

if [[ -f "./$fileNameWithoutExt.mmo" ]]; then
  mmix "./$fileNameWithoutExt.mmo" $other_params
else
  echo "FAILED TO COMPILE MMIXAL. BUILD OUTPUT:"
  cat "./mmixal-build-last"
fi

cd ..
echo "$lang" > ./output/last-lang
