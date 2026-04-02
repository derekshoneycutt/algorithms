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
for SUBDIR_REL in $(find . -maxdepth 1 -type d ! -name '.'); do
    SUBDIR="${SUBDIR_REL#./}"
    if [ -f "./$SUBDIR/build.sh" ]; then
        cd "./$SUBDIR"
        echo "cd $SUBDIR && ./build.sh $target && cd .." >> ../output/${outputfile}-build-last
        ./build.sh $target >> ../output/${outputfile}-build-last
        cd ..

        # Exit immediately on any failed builds
        LAST_RETURN_VALUE="$?"
        if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
            echo "FAILED BUILD."
            cat ./output/${outputfile}-build-last
            exit 1
        fi
        cat ./$SUBDIR/output/${outputfile}-build-last >> ./output/${outputfile}-build-last
        ALL_TO_BUILD="$ALL_TO_BUILD ../${SUBDIR}/output/${SUBDIR}-${target}.o"
    fi
done

# If all the builds are successful, we link them together into a single object file
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
echo "-------- ALL BUILD SUCCESS" >> ./output/${outputfile}-build-last
