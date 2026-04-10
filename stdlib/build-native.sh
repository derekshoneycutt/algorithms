#! /bin/sh

# This builds the standard library for a native type of assembly. This is
# typically NASM, GAS, or ARM64 assembly.

target=$1
outputfile=$2
BUILD_TARGET=$(echo "$target" | tr '[:lower:]' '[:upper:]')

# Native builds requires us to loop through and build each of subdirectories,
# and then we have to link all of the packages together with ld
echo "STARTING $BUILD_TARGET BUILD" > ./output/${outputfile}-build-last
ALL_TO_BUILD=
OUTPUT_OBJECT="./output/stdlib-${target}.o"
DO_NATIVE_LINK=0
if [ ! -f "$OUTPUT_OBJECT" ]; then
    DO_NATIVE_LINK=1
    echo "$OUTPUT_OBJECT missing; full relink required" >> ./output/${outputfile}-build-last
fi

for SUBDIR_PATH in ./*/; do
    [ -d "$SUBDIR_PATH" ] || continue
    SUBDIR_PATH="${SUBDIR_PATH%/}"
    SUBDIR="${SUBDIR_PATH#./}"
    if [ -f "./$SUBDIR/build.sh" ]; then
        cd "./$SUBDIR"
        echo "cd $SUBDIR && ./build.sh $target && cd .." >> ../output/${outputfile}-build-last
        ./build.sh "$target" >> ../output/${outputfile}-build-last 2>&1
        LAST_RETURN_VALUE="$?"
        cd ..

        # Exit immediately on any failed builds
        if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
            echo "FAILED BUILD."
            cat ./output/${outputfile}-build-last
            exit 1
        fi

        SUBDIR_OUTPUT="./$SUBDIR/output/${SUBDIR}-${target}.o"
        if [ ! -f "$SUBDIR_OUTPUT" ]; then
            echo "FAILED BUILD. Missing submodule native output: $SUBDIR_OUTPUT"
            cat ./output/${outputfile}-build-last
            exit 1
        fi

        if [ "$DO_NATIVE_LINK" -eq 0 ] && [ -n "$(find "$SUBDIR_OUTPUT" -prune -newer "$OUTPUT_OBJECT" 2>/dev/null)" ]; then
            DO_NATIVE_LINK=1
            echo "Detected newer submodule output: $SUBDIR_OUTPUT" >> ./output/${outputfile}-build-last
        fi

        cat ./$SUBDIR/output/${outputfile}-build-last >> ./output/${outputfile}-build-last
        ALL_TO_BUILD="$ALL_TO_BUILD ../${SUBDIR}/output/${SUBDIR}-${target}.o"
    fi
done

# If all the builds are successful, we link them together into a single object file
if [ "$DO_NATIVE_LINK" -eq 1 ]; then
    cd ./output
    echo "ld -r -o \"./stdlib-${target}.o\" $ALL_TO_BUILD" >> "./${outputfile}-build-last"
    ld -r -o "./stdlib-${target}.o" $ALL_TO_BUILD >> ./${outputfile}-build-last 2>&1
    LAST_RETURN_VALUE="$?"
    echo "-- ld returned: $LAST_RETURN_VALUE" >> "./${outputfile}-build-last"
    cd ..
    if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
        echo "FAILED BUILD."
        cat ./output/${outputfile}-build-last
        exit 1
    fi
    echo "NATIVE RELINK COMPLETE 1" >> ./output/${outputfile}-build-last
else
    echo "NATIVE RELINK SKIPPED 0" >> ./output/${outputfile}-build-last
fi
echo "-------- ALL BUILD SUCCESS" >> ./output/${outputfile}-build-last
