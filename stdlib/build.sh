#! /bin/sh

# This builds the standard library. A first parameter is required, which
# must be the build target.

mkdir -p ./output

BUILD_TARGET=$(echo "$1" | tr '[:lower:]' '[:upper:]')
case "$BUILD_TARGET" in
    "MMIX")
        # MMIX is just looping through each subdirectory, running build
        # in that directory, and then appending its compiled output to the
        # final output
        echo "STARTING MMIXAL BUILD" > ./output/mmixal-build-last
        echo "" > ./output/stdlib.mms
        for SUBDIR_REL in $(find . -maxdepth 1 -type d ! -name '.'); do
            SUBDIR="${SUBDIR_REL#./}"
            if [ -f "./$SUBDIR/build.sh" ]; then
                cd "./$SUBDIR"
                echo "cd $SUBDIR && ./build.sh $1 && cd .." >> ../output/mmixal-build-last
                ./build.sh $1 >> ../output/mmixal-build-last
                cd ..
                LAST_RETURN_VALUE="$?"

                # Exit immediately on any failed builds
                if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                    echo "FAILED BUILD."
                    cat ./output/mmixal-build-last
                    exit 1
                fi
                cat ./$SUBDIR/output/$SUBDIR.mms >> ./output/stdlib.mms
                cat ./$SUBDIR/output/mmixal-build-last >> ./output/mmixal-build-last
            fi
        done
        echo "ALL BUILD SUCCESS" >> ./output/mmixal-build-last
    ;;

    "LINUX-X64")
        ./build-native.sh $1 linuxx64
    ;;

    "LINUX-X64-NASM")
        ./build-native.sh $1 linuxx64nasm
    ;;

    "FREEBSD-X64")
        ./build-native.sh $1 freebsdx64
    ;;

    "FREEBSD-X64-NASM")
        ./build-native.sh $1 freebsdx64nasm
    ;;

    "DARWIN-ARM64")
        ./build-native.sh $1 darwinarm64
    ;;

    "WINDOWS-X64")
        ./build-native.sh $1 windowsx64
    ;;

    "WINDOWS-X64-NASM")
        ./build-native.sh $1 windowsx64nasm
    ;;

    "CLEAN")
        # For clean, we just loop through each subdirectory and call clean there
        for SUBDIR_REL in $(find . -maxdepth 1 -type d ! -name '.'); do
            SUBDIR="${SUBDIR_REL#./}"
            if [ -f "./$SUBDIR/build.sh" ]; then
                cd "./$SUBDIR"
                ./build.sh clean
                cd ..
            fi
        done
        rm -Rf ./output
    ;;

    *) echo "Unknown target specified '$BUILD_TARGET'"; exit 2 ;;
esac
