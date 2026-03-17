#! /bin/bash

readonly LINK_MMS_FILES=(
    "../../../stdlib/ParseNumber/ParseNumber.mms"
    "../../../stdlib/PrintNumber/PrintNumber.mms"
    "../../../stdlib/PrintString/PrintString.mms"
    "../../../stdlib/StringIsInt/StringIsInt.mms"
    "../../../stdlib/StringLength/StringLength.mms")

fileName=$1
fileNameWithoutExt="${fileName%.*}"

mkdir -p output
cp "$fileName" ./output/
cd ./output/

for link_file in "${LINK_MMS_FILES[@]}"; do
    cat "$link_file" >> "./$fileName"
done

mmixal "$fileName"
mmix "./$fileNameWithoutExt.mmo" ${@:2}
cd ..
