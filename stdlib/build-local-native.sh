#! /bin/sh

# This is a build script to build a local directory of the "standard library"
# for this algorithms project.

# This script is intended to be called by build-local.sh for native type
# assembly. This is basically everything except MMIXAL.

# WARNING: Intentionally keep stdlib output writable by all users,
# especially because Docker-based runs can create root-owned artifacts.
ensure_output_permissions() {
    if [ -d ./output ]; then
        chmod -R a+rwX ./output/ > /dev/null 2>&1
    fi
}
trap 'ensure_output_permissions' EXIT

target=$1
outputFile=$2
debugFile=$3
buildTarget=$(printf '%s' "$target" | tr '[:lower:]' '[:upper:]')

case "$buildTarget" in
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
        case "$buildTarget" in
            "LINUX-X64-NASM") SEARCH_TARGET="Linux-x64" ;;
            "FREEBSD-X64-NASM") SEARCH_TARGET="FreeBSD-x64" ;;
            *) SEARCH_TARGET=$(printf '%s' "$target" | sed 's/-[Nn][Aa][Ss][Mm]$//') ;;
        esac
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
        # WARNING: This default path assumes build-local.sh mediated calls.
        # Direct invocation with non-canonical target casing may not match sources.
        SEARCH_TARGET="$target"
        FILE_EXTENSION="asm"
        OUT_FORMAT="elf64"
        IS_WINDOWS=0
        BUILD_FUNCTION="build_native_asm"
        ;;
esac

build_native_asm() {
    echo "as -v --defsym WINDOWS=$IS_WINDOWS -o \"./output/$ASM_OBJ_OUTPUT\" \"$ASM_FILE\"" >> ./output/${debugFile}-build-last
    as -v --defsym WINDOWS=$IS_WINDOWS -o "./output/$ASM_OBJ_OUTPUT" "$ASM_FILE" >> ./output/${debugFile}-build-last 2>&1
    lastReturnValue="$?"
    echo "-- as returned: $lastReturnValue" >> "./output/${debugFile}-build-last"
}

build_native_nasm() {
    echo "nasm -w+all -f $OUT_FORMAT -o \"./output/$ASM_OBJ_OUTPUT\" \"$ASM_FILE\"" >> ./output/${debugFile}-build-last
    nasm -w+all -f $OUT_FORMAT -o "./output/$ASM_OBJ_OUTPUT" "$ASM_FILE" >> ./output/${debugFile}-build-last 2>&1
    lastReturnValue="$?"
    echo "-- nasm returned: $lastReturnValue" >> "./output/${debugFile}-build-last"
}

build_native_darwinarm64() {
    echo "as -v -arch arm64 -o \"./output/$ASM_OBJ_OUTPUT\" \"$ASM_FILE\"" >> ./output/${debugFile}-build-last
    as -v -arch arm64 -o "./output/$ASM_OBJ_OUTPUT" "$ASM_FILE" >> ./output/${debugFile}-build-last 2>&1
    lastReturnValue="$?"
    echo "-- as returned: $lastReturnValue" >> "./output/${debugFile}-build-last"
}

# For native assembly, we need to first loop through all of the files,
# building them with nasm. Then we have to link them all with ld
mkdir -p ./output
echo "STARTING $buildTarget BUILD..." > ./output/${debugFile}-build-last
echo "CONFIG: target=$target buildTarget=$buildTarget" >> ./output/${debugFile}-build-last
echo "CONFIG: SEARCH_TARGET=$SEARCH_TARGET FILE_EXTENSION=$FILE_EXTENSION OUT_FORMAT=$OUT_FORMAT BUILD_FUNCTION=$BUILD_FUNCTION" >> ./output/${debugFile}-build-last
doBuild=0
allOutputs=
matchCount=0
for ASM_FILE in ./*-"$SEARCH_TARGET"."$FILE_EXTENSION" ./*-All."$FILE_EXTENSION"; do
    [ -f "$ASM_FILE" ] || continue
    matchCount=$((matchCount + 1))
    echo "SCAN: matched source $ASM_FILE" >> ./output/${debugFile}-build-last
    case "$ASM_FILE" in
        *"-All.${FILE_EXTENSION}")
            ASM_WITHOUT_EXT="${ASM_FILE%-All.${FILE_EXTENSION}}-${target}"
        ;;
        *)
            ASM_WITHOUT_EXT="${ASM_FILE%.*}"
            if [ "$FILE_EXTENSION" = "nasm" ]; then
                case "$ASM_WITHOUT_EXT" in
                    *-nasm) ;;
                    *) ASM_WITHOUT_EXT="${ASM_WITHOUT_EXT}-nasm" ;;
                esac
            fi
        ;;
    esac
    ASM_OBJ_OUTPUT="${ASM_WITHOUT_EXT}.o"
    allOutputs="$allOutputs $ASM_OBJ_OUTPUT"
    DO_CURRENT_BUILD=0
    if [ ! -f "./output/$ASM_OBJ_OUTPUT" ]; then
        doBuild=1
        DO_CURRENT_BUILD=1
        echo "DECISION: build required; missing ./output/$ASM_OBJ_OUTPUT" >> ./output/${debugFile}-build-last
    elif [ -n "$(find "./$ASM_FILE" -prune -newer "./output/$ASM_OBJ_OUTPUT" 2>/dev/null)" ]; then
        doBuild=1
        DO_CURRENT_BUILD=1
        echo "DECISION: build required; source newer than ./output/$ASM_OBJ_OUTPUT" >> ./output/${debugFile}-build-last
    fi
    if [ "$DO_CURRENT_BUILD" -eq 1 ]; then
        echo "BUILDING: $ASM_FILE -> ./output/$ASM_OBJ_OUTPUT" >> ./output/${debugFile}-build-last
        "$BUILD_FUNCTION"
        
        # We exit completely on any failures
        if [ "$lastReturnValue" -ne 0 ]; then
            echo "FAILED BUILD."
            cat ./output/${debugFile}-build-last
            exit 1
        fi
    else
        echo "SKIP: up-to-date ./output/$ASM_OBJ_OUTPUT" >> ./output/${debugFile}-build-last
    fi
done

if [ "$matchCount" -eq 0 ]; then
    echo "SCAN: no assembly sources matched pattern" >> ./output/${debugFile}-build-last
fi

if [ ! -f "./output/$outputFile" ]; then
    doBuild=1
    echo "DECISION: link required; missing ./output/$outputFile" >> ./output/${debugFile}-build-last
fi

echo "Initial building completed; doBuild=$doBuild; moving to linking..." >> ./output/${debugFile}-build-last

# Build completed, we move to linking
if [ "$doBuild" -eq 1 ]; then
    if [ -z "$allOutputs" ]; then
        echo "FAILED BUILD. No object files to link; allOutputs is empty." >> ./output/${debugFile}-build-last
        echo "FAILED BUILD. No object files to link."
        cat ./output/${debugFile}-build-last
        exit 1
    fi
    cd ./output
    echo "cd ./output" >> "./${debugFile}-build-last"
    echo "ld -v -r -o \"./$outputFile\" $allOutputs" >> "./${debugFile}-build-last"
    ld -v -r -o "./$outputFile" $allOutputs >> ./${debugFile}-build-last 2>&1
    lastReturnValue="$?"
    echo "-- ld returned: $lastReturnValue" >> "./${debugFile}-build-last"
    echo "cd .." >> "./${debugFile}-build-last"
    cd ..

    # We exit completely on any failures
    if [ "$lastReturnValue" -ne 0 ]; then
        echo "FAILED BUILD."
        cat ./output/${debugFile}-build-last
        exit 1
    fi
else
    echo "SKIP: link step; output already up-to-date" >> ./output/${debugFile}-build-last
fi

echo "---- BUILD END" >> ./output/${debugFile}-build-last
