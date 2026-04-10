#! /bin/sh

# This is a build script to build a local directory of the "standard library"
# for this algorithms project.

# This script is intended to be called by build-local.sh for native type
# assembly. This is basically everything except MMIXAL.

TARGET=$1
OUTPUT_FILE=$2
DEBUG_FILE=$3
BUILD_TARGET=$(echo "$TARGET" | tr '[:lower:]' '[:upper:]')

case "$BUILD_TARGET" in
    "WINDOWS-X64")
        SEARCH_TARGET="Windows-x64"
        FILE_EXTENSION="asm"
        OUT_FORMAT="win64"
        IS_WINDOWS=1
        BUILD_FUNCTION="build_native_asm"
        ;;
    "WINDOWS-X64-NASM")
        SEARCH_TARGET="Windows-x64"
        FILE_EXTENSION="nasm"
        OUT_FORMAT="win64"
        IS_WINDOWS=1
        BUILD_FUNCTION="build_native_nasm"
        ;;
    *"-NASM")
        SEARCH_TARGET="${TARGET%-nasm}"
        FILE_EXTENSION="nasm"
        OUT_FORMAT="elf64"
        IS_WINDOWS=0
        BUILD_FUNCTION="build_native_nasm"
        ;;
    "DARWIN-ARM64")
        SEARCH_TARGET="Darwin-arm64"
        FILE_EXTENSION="s"
        OUT_FORMAT="arm64"
        IS_WINDOWS=0
        BUILD_FUNCTION="build_native_darwinarm64"
        ;;
    *)
        SEARCH_TARGET="$TARGET"
        FILE_EXTENSION="asm"
        OUT_FORMAT="elf64"
        IS_WINDOWS=0
        BUILD_FUNCTION="build_native_asm"
        ;;
esac

build_native_asm() {
    echo "as --defsym WINDOWS=$IS_WINDOWS -o \"./output/$ASM_OBJ_OUTPUT\" \"$ASM_FILE\"" >> ./output/${DEBUG_FILE}-build-last
    as --defsym WINDOWS=$IS_WINDOWS -o "./output/$ASM_OBJ_OUTPUT" "$ASM_FILE" >> ./output/${DEBUG_FILE}-build-last 2>&1
    LAST_RETURN_VALUE="$?"
    echo "-- as returned: $LAST_RETURN_VALUE" >> "./output/${DEBUG_FILE}-build-last"
}

build_native_nasm() {
    echo "nasm -f $OUT_FORMAT -o \"./output/$ASM_OBJ_OUTPUT\" \"$ASM_FILE\"" >> ./output/${DEBUG_FILE}-build-last
    nasm -f $OUT_FORMAT -o "./output/$ASM_OBJ_OUTPUT" "$ASM_FILE" >> ./output/${DEBUG_FILE}-build-last 2>&1
    LAST_RETURN_VALUE="$?"
    echo "-- nasm returned: $LAST_RETURN_VALUE" >> "./output/${DEBUG_FILE}-build-last"
}

build_native_darwinarm64() {
    echo "as -arch arm64 -o \"./output/$ASM_OBJ_OUTPUT\" \"$ASM_FILE\"" >> ./output/${DEBUG_FILE}-build-last
    as -arch arm64 -o "./output/$ASM_OBJ_OUTPUT" "$ASM_FILE" >> ./output/${DEBUG_FILE}-build-last 2>&1
    LAST_RETURN_VALUE="$?"
    echo "-- as returned: $LAST_RETURN_VALUE" >> "./output/${DEBUG_FILE}-build-last"
}

# For native assembly, we need to first loop through all of the files,
# building them with nasm. Then we have to link them all with ld
mkdir -p ./output
echo "STARTING $BUILD_TARGET BUILD..." > ./output/${DEBUG_FILE}-build-last
echo "CONFIG: TARGET=$TARGET BUILD_TARGET=$BUILD_TARGET" >> ./output/${DEBUG_FILE}-build-last
echo "CONFIG: SEARCH_TARGET=$SEARCH_TARGET FILE_EXTENSION=$FILE_EXTENSION OUT_FORMAT=$OUT_FORMAT BUILD_FUNCTION=$BUILD_FUNCTION" >> ./output/${DEBUG_FILE}-build-last
DO_BUILD=0
ALL_OUTPUTS=
MATCH_COUNT=0
for ASM_FILE in ./*-"$SEARCH_TARGET"."$FILE_EXTENSION" ./*-All."$FILE_EXTENSION"; do
    [ -f "$ASM_FILE" ] || continue
    MATCH_COUNT=$((MATCH_COUNT + 1))
    echo "SCAN: matched source $ASM_FILE" >> ./output/${DEBUG_FILE}-build-last
    case "$ASM_FILE" in
        *"-All.${FILE_EXTENSION}")
            ASM_WITHOUT_EXT="${ASM_FILE%-All.${FILE_EXTENSION}}-${TARGET}"
        ;;
        *) ASM_WITHOUT_EXT="${ASM_FILE%.*}" ;;
    esac
    ASM_OBJ_OUTPUT="${ASM_WITHOUT_EXT}.o"
    ALL_OUTPUTS="$ALL_OUTPUTS $ASM_OBJ_OUTPUT"
    DO_CURRENT_BUILD=0
    if [ ! -f "./output/$ASM_OBJ_OUTPUT" ]; then
        DO_BUILD=1
        DO_CURRENT_BUILD=1
        echo "DECISION: build required; missing ./output/$ASM_OBJ_OUTPUT" >> ./output/${DEBUG_FILE}-build-last
    elif [ -n "$(find "./$ASM_FILE" -prune -newer "./output/$ASM_OBJ_OUTPUT" 2>/dev/null)" ]; then
        DO_BUILD=1
        DO_CURRENT_BUILD=1
        echo "DECISION: build required; source newer than ./output/$ASM_OBJ_OUTPUT" >> ./output/${DEBUG_FILE}-build-last
    fi
    if [ "$DO_CURRENT_BUILD" -eq 1 ]; then
        echo "BUILDING: $ASM_FILE -> ./output/$ASM_OBJ_OUTPUT" >> ./output/${DEBUG_FILE}-build-last
        "$BUILD_FUNCTION"
        
        # We exit completely on any failures
        if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
            echo "FAILED BUILD."
            cat ./output/${DEBUG_FILE}-build-last
            exit 1
        fi
    else
        echo "SKIP: up-to-date ./output/$ASM_OBJ_OUTPUT" >> ./output/${DEBUG_FILE}-build-last
    fi
done

if [ "$MATCH_COUNT" -eq 0 ]; then
    echo "SCAN: no assembly sources matched pattern" >> ./output/${DEBUG_FILE}-build-last
fi

if [ ! -f "./output/$OUTPUT_FILE" ]; then
    DO_BUILD=1
    echo "DECISION: link required; missing ./output/$OUTPUT_FILE" >> ./output/${DEBUG_FILE}-build-last
fi

echo "Initial building completed; DO_BUILD=$DO_BUILD; moving to linking..." >> ./output/${DEBUG_FILE}-build-last

# Build completed, we move to linking
if [ "$DO_BUILD" -eq 1 ]; then
    cd ./output
    echo "cd ./output" >> "./${DEBUG_FILE}-build-last"
    echo "ld -r -o \"./$OUTPUT_FILE\" $ALL_OUTPUTS" >> "./${DEBUG_FILE}-build-last"
    ld -r -o "./$OUTPUT_FILE" $ALL_OUTPUTS >> ./${DEBUG_FILE}-build-last 2>&1
    LAST_RETURN_VALUE="$?"
    echo "-- ld returned: $LAST_RETURN_VALUE" >> "./${DEBUG_FILE}-build-last"
    echo "cd .." >> "./${DEBUG_FILE}-build-last"
    cd ..

    # We exit completely on any failures
    if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
        echo "FAILED BUILD."
        cat ./output/${DEBUG_FILE}-build-last
        exit 1
    fi
else
    echo "SKIP: link step; output already up-to-date" >> ./output/${DEBUG_FILE}-build-last
fi

echo "---- BUILD END" >> ./output/${DEBUG_FILE}-build-last
