#! /bin/sh

# This builds the standard library. A first parameter is required, which
# must be the build target.

# WARNING: Intentionally keep stdlib output writable by all users,
# especially because Docker-based runs can create root-owned artifacts.
ensure_output_permissions() {
    if [ -d ./output ]; then
        chmod -R a+rwX ./output/ > /dev/null 2>&1
    fi
}
trap 'ensure_output_permissions' EXIT

mkdir -p ./output

buildTarget=$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')
case "$buildTarget" in
    "MMIX")
        # MMIX is just looping through each subdirectory, running build
        # in that directory, and then appending its compiled output to the
        # final output
        echo "STARTING MMIXAL BUILD" > ./output/mmixal-build-last
        DO_MMIX_COMBINE=0
        if [ ! -f "./output/stdlib.mms" ]; then
            DO_MMIX_COMBINE=1
            echo "./output/stdlib.mms missing; full combine required" >> ./output/mmixal-build-last
        fi

        for SUBDIR_PATH in ./*/; do
            [ -d "$SUBDIR_PATH" ] || continue
            SUBDIR_PATH="${SUBDIR_PATH%/}"
            SUBDIR="${SUBDIR_PATH#./}"
            if [ -f "./$SUBDIR/build.sh" ]; then
                cd "./$SUBDIR" || { echo "FAILED BUILD. cd into ./$SUBDIR failed."; exit 1; }
                echo "cd $SUBDIR && ./build.sh $1 && cd .." >> ../output/mmixal-build-last
                ./build.sh "$1" >> ../output/mmixal-build-last 2>&1
                LAST_RETURN_VALUE="$?"
                cd ..

                # Exit immediately on any failed builds
                if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                    echo "FAILED BUILD."
                    cat ./output/mmixal-build-last
                    exit 1
                fi

                if [ ! -f "./$SUBDIR/output/$SUBDIR.mms" ]; then
                    echo "FAILED BUILD. Missing submodule MMIX output: ./$SUBDIR/output/$SUBDIR.mms"
                    cat ./output/mmixal-build-last
                    exit 1
                fi

                if [ "$DO_MMIX_COMBINE" -eq 0 ] && [ -n "$(find "./$SUBDIR/output/$SUBDIR.mms" -prune -newer "./output/stdlib.mms" 2>/dev/null)" ]; then
                    DO_MMIX_COMBINE=1
                    echo "Detected newer submodule output: ./$SUBDIR/output/$SUBDIR.mms" >> ./output/mmixal-build-last
                fi

                cat ./$SUBDIR/output/mmixal-build-last >> ./output/mmixal-build-last
                submodule_log_merge_ret="$?"
                if [ "$submodule_log_merge_ret" -ne 0 ]; then
                    echo "WARNING: failed to append ./$SUBDIR/output/mmixal-build-last (returned $submodule_log_merge_ret)"
                fi
            fi
        done

        if [ "$DO_MMIX_COMBINE" -eq 1 ]; then
            : > ./output/stdlib.mms
            for SUBDIR_PATH in ./*/; do
                [ -d "$SUBDIR_PATH" ] || continue
                SUBDIR_PATH="${SUBDIR_PATH%/}"
                SUBDIR="${SUBDIR_PATH#./}"
                if [ -f "./$SUBDIR/build.sh" ]; then
                    echo "cat ./$SUBDIR/output/$SUBDIR.mms >> ./output/stdlib.mms" >> ./output/mmixal-build-last
                    cat ./$SUBDIR/output/$SUBDIR.mms >> ./output/stdlib.mms
                    cat_ret="$?"
                    if [ "$cat_ret" -ne 0 ]; then
                        echo "FAILED BUILD. MMIX merge failed for ./$SUBDIR/output/$SUBDIR.mms (returned $cat_ret)" >> ./output/mmixal-build-last
                        cat ./output/mmixal-build-last
                        exit "$cat_ret"
                    fi
                fi
            done
            echo "MMIXAL COMBINE COMPLETE 1" >> ./output/mmixal-build-last
        else
            echo "MMIXAL COMBINE SKIPPED 0" >> ./output/mmixal-build-last
        fi

        echo "ALL BUILD SUCCESS" >> ./output/mmixal-build-last
    ;;

    "LINUX-X64")
        ./build-native.sh "$1" linuxx64
    ;;

    "LINUX-X64-NASM")
        ./build-native.sh "$1" linuxx64nasm
    ;;

    "FREEBSD-X64")
        ./build-native.sh "$1" freebsdx64
    ;;

    "FREEBSD-X64-NASM")
        ./build-native.sh "$1" freebsdx64nasm
    ;;

    "DARWIN-ARM64")
        ./build-native.sh "$1" darwinarm64
    ;;

    "WINDOWS-X64")
        ./build-native.sh "$1" windowsx64
    ;;

    "WINDOWS-X64-NASM")
        ./build-native.sh "$1" windowsx64nasm
    ;;

    "CLEAN")
        # For clean, we loop through each subdirectory and call clean there.
        # Continue even if one sub-clean fails, but return non-zero at the end.
        clean_ret=0
        for SUBDIR_PATH in ./*/; do
            [ -d "$SUBDIR_PATH" ] || continue
            SUBDIR_PATH="${SUBDIR_PATH%/}"
            SUBDIR="${SUBDIR_PATH#./}"
            if [ -f "./$SUBDIR/build.sh" ]; then
                cd "./$SUBDIR" || { echo "WARNING: cd into ./$SUBDIR failed; skipping."; clean_ret=1; continue; }
                ./build.sh clean
                sub_clean_ret="$?"
                cd ..
                if [ "$sub_clean_ret" -ne 0 ]; then
                    echo "WARNING: clean failed in ./$SUBDIR (returned $sub_clean_ret)"
                    if [ "$clean_ret" -eq 0 ]; then
                        clean_ret="$sub_clean_ret"
                    fi
                fi
            fi
        done
        rm -Rf ./output
        rm_ret="$?"
        if [ "$rm_ret" -ne 0 ]; then
            echo "WARNING: failed to remove ./output (returned $rm_ret)"
            if [ "$clean_ret" -eq 0 ]; then
                clean_ret="$rm_ret"
            fi
        fi
        exit "$clean_ret"
    ;;

    *) echo "Unknown target specified '$buildTarget'"; exit 2 ;;
esac
