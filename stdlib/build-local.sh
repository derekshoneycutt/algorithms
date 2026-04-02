#! /bin/sh

# This is a build script to build a local directory of the "standard library"
# for this algorithms project.

# This script is intended to be called by the build script within the
# subdirectory.

TARGET=$1
BUILD_TARGET=$(echo "$TARGET" | tr '[:lower:]' '[:upper:]')
OUTPUT_FILE=$2

case "$BUILD_TARGET" in
    "MMIX")
        # For MMIX, we loop through all mms files in the current directory,
        # and merge them into the single file given in the second parameter
        mkdir -p ./output
        echo "STARTING MMIXAL BUILD..." > ./output/mmixal-build-last
        DO_MMIX_BUILD=0
        for MMIX_FILE_REL in $(find . -maxdepth 1 -type f -name '*.mms'); do
            MMIX_FILE="${MMIX_FILE_REL#./}"
            if [ ! -f "./output/$OUTPUT_FILE" ]; then
                DO_MMIX_BUILD=1
            elif [ -n "$(find "./$MMIX_FILE" -prune -newer "./output/$OUTPUT_FILE" 2>/dev/null)" ]; then
                DO_MMIX_BUILD=1
            fi
        done

        if [ "$DO_MMIX_BUILD" -eq 1 ]; then
            rm -f "./output/$OUTPUT_FILE"
            for MMIX_FILE_REL in $(find . -maxdepth 1 -type f -name '*.mms'); do
                MMIX_FILE="${MMIX_FILE_REL#./}"
                echo "cat \"./$MMIX_FILE\" >> \"./output/$OUTPUT_FILE\"" >> ./output/mmixal-build-last
                cat "./$MMIX_FILE" >> "./output/$OUTPUT_FILE"
            done
        fi
        echo "MMIXAL COMPLETE $DO_MMIX_BUILD" >> ./output/mmixal-build-last
    ;;
    
    "LINUX-X64")
        ../build-local-native.sh "$TARGET" "$OUTPUT_FILE" "linuxx64"
    ;;
    
    "LINUX-X64-NASM")
        ../build-local-native.sh "$TARGET" "$OUTPUT_FILE" "linuxx64nasm"
    ;;
    
    "FREEBSD-X64")
        ../build-local-native.sh "$TARGET" "$OUTPUT_FILE" "freebsdx64"
    ;;
    
    "FREEBSD-X64-NASM")
        ../build-local-native.sh "$TARGET" "$OUTPUT_FILE" "freebsdx64nasm"
    ;;
    
    "DARWIN-ARM64")
        ../build-local-native.sh "$TARGET" "$OUTPUT_FILE" "darwinarm64"
    ;;

    "WINDOWS-X64")
        ../build-local-native.sh "$TARGET" "$OUTPUT_FILE" "windowsx64"
    ;;

    "WINDOWS-X64-NASM")
        ../build-local-native.sh "$TARGET" "$OUTPUT_FILE" "windowsx64nasm"
    ;;

    "CLEAN")
        # If we have a clean target, we just delete the output
        rm -Rf ./output
    ;;

    *) echo "Unknown target specified '$BUILD_TARGET'" ;;
esac
