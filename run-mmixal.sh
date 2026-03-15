#! /bin/bash

readonly LINK_MMS_FILES=(
    "../../../Core/ParseNumber/ParseNumber.mms"
    "../../../Core/PrintNumber/PrintNumber.mms")

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
