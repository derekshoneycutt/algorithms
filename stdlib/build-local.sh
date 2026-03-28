#! /bin/sh

# This is a build script to build a local directory of the "standard library"
# for this algorithms project.

# Available build targets are MMIX and LINUX-X64 (case insensitive)
# CLEAN target cleans out the output entirely

# This script is intended to be called by the build script within the
# subdirectory.

BUILD_TARGET=$(echo "$1" | tr '[:lower:]' '[:upper:]')
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
        # For Linux x86 64, we need to first loop through all of the files,
        # building them with nasm. Then we have to link them all with ld
        mkdir -p ./output
        echo "STARTING LINUX-X64 BUILD..." > ./output/linuxx64-build-last
        DO_LINUX_X64_BUILD=0
        ALL_LINUX_X64_OUTPUTS=
        for NASM_FILE in $(find . -maxdepth 1 -type f -name '*-Linux-x64.nasm'); do
            NASM_WITHOUT_EXT="${NASM_FILE%.*}"
            NASM_OBJ_OUTPUT="${NASM_WITHOUT_EXT}.o"
            ALL_LINUX_X64_OUTPUTS="$ALL_LINUX_X64_OUTPUTS $NASM_OBJ_OUTPUT"
            DO_CURRENT_LINUX_X64_BUILD=0
            if [ ! -f "./output/$NASM_OBJ_OUTPUT" ]; then
                DO_LINUX_X64_BUILD=1
                DO_CURRENT_LINUX_X64_BUILD=1
            elif [ -n "$(find "./$NASM_FILE" -prune -newer "./output/$NASM_OBJ_OUTPUT" 2>/dev/null)" ]; then
                DO_LINUX_X64_BUILD=1
                DO_CURRENT_LINUX_X64_BUILD=1
            fi
            if [ "$DO_CURRENT_LINUX_X64_BUILD" -eq 1 ]; then
                echo "nasm -f elf64 -o \"./output/$NASM_OBJ_OUTPUT\" \"$NASM_FILE\"" >> ./output/linuxx64-build-last
                nasm -f elf64 -o "./output/$NASM_OBJ_OUTPUT" "$NASM_FILE" >> ./output/linuxx64-build-last 2>&1
                LAST_RETURN_VALUE="$?"
                echo "-- nasm returned: $LAST_RETURN_VALUE" >> "./output/linuxx64-build-last"

                # We exit completely on any failures
                if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                    echo "FAILED BUILD."
                    cat ./output/linuxx64-build-last
                    exit 1
                fi
            fi
        done

        if [ ! -f "./output/$OUTPUT_FILE" ]; then
            DO_LINUX_X64_BUILD=1
        fi

        echo "Initial building completed; $DO_LINUX_X64_BUILD; moving to linking..." >> ./output/linuxx64-build-last

        # Build completed, we move to linking
        if [ "$DO_LINUX_X64_BUILD" -eq 1 ]; then
            cd ./output
            echo "cd ./output" >> "./linuxx64-build-last"
            echo "ld -r -o \"./$OUTPUT_FILE\" $ALL_LINUX_X64_OUTPUTS" >> "./linuxx64-build-last"
            ld -r -o "./$OUTPUT_FILE" $ALL_LINUX_X64_OUTPUTS >> ./linuxx64-build-last 2>&1
            LAST_RETURN_VALUE="$?"
            echo "-- ld returned: $LAST_RETURN_VALUE" >> "./linuxx64-build-last"
            echo "cd .." >> "./linuxx64-build-last"
            cd ..

            # We exit completely on any failures
            if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                echo "FAILED BUILD."
                cat ./output/linuxx64-build-last
                exit 1
            fi
        fi

        echo "LINUX-X64 BUILD END" >> ./output/linuxx64-build-last
    ;;
    
    "FREEBSD-X64")
        # For FreeBSD x86 64, we need to first loop through all of the files,
        # building them with nasm. Then we have to link them all with ld
        mkdir -p ./output
        echo "STARTING FREEBSD-X64 BUILD..." > ./output/freebsdx64-build-last
        DO_FREEBSD_X64_BUILD=0
        ALL_FREEBSD_X64_OUTPUTS=
        for NASM_FILE in $(find . -maxdepth 1 -type f -name '*-FreeBSD-x64.nasm'); do
            NASM_WITHOUT_EXT="${NASM_FILE%.*}"
            NASM_OBJ_OUTPUT="${NASM_WITHOUT_EXT}.o"
            ALL_FREEBSD_X64_OUTPUTS="$ALL_FREEBSD_X64_OUTPUTS $NASM_OBJ_OUTPUT"
            DO_CURRENT_FREEBSD_X64_BUILD=0
            if [ ! -f "./output/$NASM_OBJ_OUTPUT" ]; then
                DO_FREEBSD_X64_BUILD=1
                DO_CURRENT_FREEBSD_X64_BUILD=1
            elif [ -n "$(find "./$NASM_FILE" -prune -newer "./output/$NASM_OBJ_OUTPUT" 2>/dev/null)" ]; then
                DO_FREEBSD_X64_BUILD=1
                DO_CURRENT_FREEBSD_X64_BUILD=1
            fi
            if [ "$DO_CURRENT_FREEBSD_X64_BUILD" -eq 1 ]; then
                echo "nasm -f elf64 -o \"./output/$NASM_OBJ_OUTPUT\" \"$NASM_FILE\"" >> ./output/freebsdx64-build-last
                nasm -f elf64 -o "./output/$NASM_OBJ_OUTPUT" "$NASM_FILE" >> ./output/freebsdx64-build-last 2>&1
                LAST_RETURN_VALUE="$?"
                echo "-- nasm returned: $LAST_RETURN_VALUE" >> "./output/freebsdx64-build-last"

                # We exit completely on any failures
                if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                    echo "FAILED BUILD."
                    cat ./output/freebsdx64-build-last
                    exit 1
                fi
            fi
        done

        if [ ! -f "./output/$OUTPUT_FILE" ]; then
            DO_FREEBSD_X64_BUILD=1
        fi

        echo "Initial building completed; $DO_FREEBSD_X64_BUILD; moving to linking..." >> ./output/freebsdx64-build-last

        # Build completed, we move to linking
        if [ "$DO_FREEBSD_X64_BUILD" -eq 1 ]; then
            cd ./output
            echo "cd ./output" >> "./freebsdx64-build-last"
            echo "ld -r -o \"./$OUTPUT_FILE\" $ALL_FREEBSD_X64_OUTPUTS" >> "./freebsdx64-build-last"
            ld -r -o "./$OUTPUT_FILE" $ALL_FREEBSD_X64_OUTPUTS >> ./freebsdx64-build-last 2>&1
            LAST_RETURN_VALUE="$?"
            echo "-- ld returned: $LAST_RETURN_VALUE" >> "./freebsdx64-build-last"
            echo "cd .." >> "./freebsdx64-build-last"
            cd ..

            # We exit completely on any failures
            if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                echo "FAILED BUILD."
                cat ./output/freebsdx64-build-last
                exit 1
            fi
        fi

        echo "FREEBSD-X64 BUILD END" >> ./output/freebsdx64-build-last
    ;;

    "CLEAN")
        # If we have a clean target, we just delete the output
        rm -Rf ./output
    ;;

    *) echo "Unknown target specified '$BUILD_TARGET'" ;;
esac
