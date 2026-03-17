#! /bin/bash

readonly LINK_MMS_FILES=(
    "ParseNumber"
    "PrintString"
    "PrintNumber"
    "StringLength"
    "StringIsInt")

start_dir=$PWD
fileName=$1
fileNameWithoutExt="${fileName%.*}"
link_with=
stdlib=../../stdlib/output/stdlib.o
build_stdlib=0
do_link=0
other_params=${@:2}

# First go into stdlib and build the standard library ;)
#   Only build if there's new changes to be built
cd ../../stdlib/
mkdir -p ./output
for link_file in "${LINK_MMS_FILES[@]}"; do
    if [ "./$link_file/$link_file.nasm" -nt "./output/$link_file.o" ]; then
        nasm -f elf64 -o ./output/$link_file.o ./$link_file/$link_file.nasm
        build_stdlib=1
    fi
    link_with+=" ./output/$link_file.o"
done
if [ "$build_stdlib" -eq 1 ]; then
    ld -r -o ./output/stdlib.o $link_with
    do_link=1
fi
cd $start_dir

# Now we build our actual output, linking to the standard library
#   Only build if there's new changes to be built
mkdir -p output
if [ "$fileName" -nt "./output/$fileNameWithoutExt.o" ]; then
    nasm -f elf64 -o ./output/$fileNameWithoutExt.o $fileName
    do_link=1
fi
if [ ! -f "./output/$fileNameWithoutExt" ]; then
    do_link=1
elif [ "$stdlib" -nt "./output/$fileNameWithoutExt" ]; then
    do_link=1
fi
if [ "$do_link" -eq 1 ]; then
    ld -o ./output/$fileNameWithoutExt ./output/$fileNameWithoutExt.o $stdlib
#    gcc -no-pie -o ./output/$fileNameWithoutExt ./output/$fileNameWithoutExt.o $stdlib
fi

# Run
"./output/$fileNameWithoutExt" $other_params
