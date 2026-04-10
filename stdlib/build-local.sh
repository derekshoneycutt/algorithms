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
        echo "CONFIG: TARGET=$TARGET BUILD_TARGET=$BUILD_TARGET OUTPUT_FILE=$OUTPUT_FILE" >> ./output/mmixal-build-last
        DO_MMIX_BUILD=0
        MMIX_MATCH_COUNT=0
        for MMIX_FILE_PATH in ./*.mms; do
            [ -f "$MMIX_FILE_PATH" ] || continue
            MMIX_FILE="${MMIX_FILE_PATH#./}"
            MMIX_MATCH_COUNT=$((MMIX_MATCH_COUNT + 1))
            echo "SCAN: matched source ./$MMIX_FILE" >> ./output/mmixal-build-last
            if [ ! -f "./output/$OUTPUT_FILE" ]; then
                DO_MMIX_BUILD=1
                echo "DECISION: combine required; missing ./output/$OUTPUT_FILE" >> ./output/mmixal-build-last
            elif [ -n "$(find "./$MMIX_FILE" -prune -newer "./output/$OUTPUT_FILE" 2>/dev/null)" ]; then
                DO_MMIX_BUILD=1
                echo "DECISION: combine required; source newer than ./output/$OUTPUT_FILE (./$MMIX_FILE)" >> ./output/mmixal-build-last
            fi
        done

        if [ "$MMIX_MATCH_COUNT" -eq 0 ]; then
            echo "SCAN: no MMIX sources matched (*.mms)" >> ./output/mmixal-build-last
        fi

        if [ "$DO_MMIX_BUILD" -eq 1 ]; then
            echo "BUILDING: refreshing ./output/$OUTPUT_FILE" >> ./output/mmixal-build-last
            rm -f "./output/$OUTPUT_FILE"
            for MMIX_FILE_PATH in ./*.mms; do
                [ -f "$MMIX_FILE_PATH" ] || continue
                MMIX_FILE="${MMIX_FILE_PATH#./}"
                echo "cat \"./$MMIX_FILE\" >> \"./output/$OUTPUT_FILE\"" >> ./output/mmixal-build-last
                cat "./$MMIX_FILE" >> "./output/$OUTPUT_FILE"
            done
            echo "BUILD COMPLETE: wrote ./output/$OUTPUT_FILE" >> ./output/mmixal-build-last
        else
            echo "SKIP: MMIX combine step; ./output/$OUTPUT_FILE is up-to-date" >> ./output/mmixal-build-last
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

    *) echo "Unknown target specified '$BUILD_TARGET'"; exit 2 ;;
esac
