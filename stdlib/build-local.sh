#! /bin/sh

# This is a build script to build a local directory of the "standard library"
# for this algorithms project.

# This script is intended to be called by the build script within the
# subdirectory.

# WARNING: Intentionally keep stdlib output writable by all users,
# especially because Docker-based runs can create root-owned artifacts.
ensure_output_permissions() {
    if [ -d ./output ]; then
        chmod -R a+rwX ./output/ > /dev/null 2>&1
    fi
}
trap 'ensure_output_permissions' EXIT

target=$1
buildTarget=$(printf '%s' "$target" | tr '[:lower:]' '[:upper:]')
outputFile=$2

case "$buildTarget" in
    "MMIX")
        # For MMIX, we loop through all mms files in the current directory,
        # and merge them into the single file given in the second parameter
        mkdir -p ./output
        echo "STARTING MMIXAL BUILD..." > ./output/mmixal-build-last
        echo "CONFIG: target=$target buildTarget=$buildTarget outputFile=$outputFile" >> ./output/mmixal-build-last
        DO_MMIX_BUILD=0
        MMIX_MATCH_COUNT=0
        for MMIX_FILE_PATH in ./*.mms; do
            [ -f "$MMIX_FILE_PATH" ] || continue
            MMIX_FILE="${MMIX_FILE_PATH#./}"
            MMIX_MATCH_COUNT=$((MMIX_MATCH_COUNT + 1))
            echo "SCAN: matched source ./$MMIX_FILE" >> ./output/mmixal-build-last
            if [ ! -f "./output/$outputFile" ]; then
                DO_MMIX_BUILD=1
                echo "DECISION: combine required; missing ./output/$outputFile" >> ./output/mmixal-build-last
            elif [ -n "$(find "./$MMIX_FILE" -prune -newer "./output/$outputFile" 2>/dev/null)" ]; then
                DO_MMIX_BUILD=1
                echo "DECISION: combine required; source newer than ./output/$outputFile (./$MMIX_FILE)" >> ./output/mmixal-build-last
            fi
        done

        if [ "$MMIX_MATCH_COUNT" -eq 0 ]; then
            echo "SCAN: no MMIX sources matched (*.mms)" >> ./output/mmixal-build-last
        fi

        if [ "$DO_MMIX_BUILD" -eq 1 ]; then
            echo "BUILDING: refreshing ./output/$outputFile" >> ./output/mmixal-build-last
            rm -f "./output/$outputFile"
            for MMIX_FILE_PATH in ./*.mms; do
                [ -f "$MMIX_FILE_PATH" ] || continue
                MMIX_FILE="${MMIX_FILE_PATH#./}"
                echo "cat \"./$MMIX_FILE\" >> \"./output/$outputFile\"" >> ./output/mmixal-build-last
                cat "./$MMIX_FILE" >> "./output/$outputFile"
                cat_ret="$?"
                if [ "$cat_ret" -ne 0 ]; then
                    echo "FAILED BUILD. MMIX merge failed for ./$MMIX_FILE (returned $cat_ret)" >> ./output/mmixal-build-last
                    cat ./output/mmixal-build-last
                    exit "$cat_ret"
                fi
            done
            echo "BUILD COMPLETE: wrote ./output/$outputFile" >> ./output/mmixal-build-last
        else
            echo "SKIP: MMIX combine step; ./output/$outputFile is up-to-date" >> ./output/mmixal-build-last
        fi
        echo "MMIXAL COMPLETE $DO_MMIX_BUILD" >> ./output/mmixal-build-last
    ;;
    
    "LINUX-X64")
        ../build-local-native.sh "$target" "$outputFile" "linuxx64"
    ;;
    
    "LINUX-X64-NASM")
        ../build-local-native.sh "$target" "$outputFile" "linuxx64nasm"
    ;;
    
    "FREEBSD-X64")
        ../build-local-native.sh "$target" "$outputFile" "freebsdx64"
    ;;
    
    "FREEBSD-X64-NASM")
        ../build-local-native.sh "$target" "$outputFile" "freebsdx64nasm"
    ;;
    
    "DARWIN-ARM64")
        ../build-local-native.sh "$target" "$outputFile" "darwinarm64"
    ;;

    "WINDOWS-X64")
        ../build-local-native.sh "$target" "$outputFile" "windowsx64"
    ;;

    "WINDOWS-X64-NASM")
        ../build-local-native.sh "$target" "$outputFile" "windowsx64nasm"
    ;;

    "CLEAN")
        # If we have a clean target, we just delete the output
        rm -Rf ./output
        clean_ret="$?"
        if [ "$clean_ret" -ne 0 ]; then
            echo "WARNING: failed to remove ./output (returned $clean_ret)"
        fi
        exit "$clean_ret"
    ;;

    *) echo "Unknown target specified '$buildTarget'"; exit 2 ;;
esac
