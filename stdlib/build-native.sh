#! /bin/sh

# This builds the standard library for a native type of assembly. This is
# typically NASM, GAS, or ARM64 assembly.

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
buildTarget=$(printf '%s' "$target" | tr '[:lower:]' '[:upper:]')
targetCanonical=""
case "$buildTarget" in
    "LINUX-X64") targetCanonical="Linux-x64" ;;
    "LINUX-X64-NASM") targetCanonical="Linux-x64-nasm" ;;
    "FREEBSD-X64") targetCanonical="FreeBSD-x64" ;;
    "FREEBSD-X64-NASM") targetCanonical="FreeBSD-x64-nasm" ;;
    "DARWIN-ARM64") targetCanonical="Darwin-arm64" ;;
    "WINDOWS-X64") targetCanonical="Windows-x64" ;;
    "WINDOWS-X64-NASM") targetCanonical="Windows-x64-nasm" ;;
    *) targetCanonical="$target" ;;
esac
mkdir -p ./output

# Native builds requires us to loop through and build each of subdirectories,
# and then we have to link all of the packages together with ld
echo "STARTING $buildTarget BUILD" > ./output/${outputFile}-build-last
allToBuild=
outputObject="./output/stdlib-${targetCanonical}.o"
doNativeLink=0
if [ ! -f "$outputObject" ]; then
    doNativeLink=1
    echo "$outputObject missing; full relink required" >> ./output/${outputFile}-build-last
fi

for SUBDIR_PATH in ./*/; do
    [ -d "$SUBDIR_PATH" ] || continue
    SUBDIR_PATH="${SUBDIR_PATH%/}"
    SUBDIR="${SUBDIR_PATH#./}"
    if [ -f "./$SUBDIR/build.sh" ]; then
        cd "./$SUBDIR" || { echo "FAILED BUILD. cd into ./$SUBDIR failed."; cat ./output/${outputFile}-build-last; exit 1; }
        echo "cd $SUBDIR && ./build.sh $targetCanonical && cd .." >> ../output/${outputFile}-build-last
        ./build.sh "$targetCanonical" >> ../output/${outputFile}-build-last 2>&1
        LAST_RETURN_VALUE="$?"
        cd ..

        # Exit immediately on any failed builds
        if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
            echo "FAILED BUILD."
            cat ./output/${outputFile}-build-last
            exit 1
        fi

        SUBDIR_OUTPUT="./$SUBDIR/output/${SUBDIR}-${targetCanonical}.o"
        if [ ! -f "$SUBDIR_OUTPUT" ]; then
            echo "FAILED BUILD. Missing submodule native output: $SUBDIR_OUTPUT"
            cat ./output/${outputFile}-build-last
            exit 1
        fi

        if [ "$doNativeLink" -eq 0 ] && [ -n "$(find "$SUBDIR_OUTPUT" -prune -newer "$outputObject" 2>/dev/null)" ]; then
            doNativeLink=1
            echo "Detected newer submodule output: $SUBDIR_OUTPUT" >> ./output/${outputFile}-build-last
        fi

        cat ./$SUBDIR/output/${outputFile}-build-last >> ./output/${outputFile}-build-last
        submodule_log_merge_ret="$?"
        if [ "$submodule_log_merge_ret" -ne 0 ]; then
            echo "WARNING: failed to append ./$SUBDIR/output/${outputFile}-build-last (returned $submodule_log_merge_ret)"
        fi
        allToBuild="$allToBuild ../${SUBDIR}/output/${SUBDIR}-${targetCanonical}.o"
    fi
done

# If all the builds are successful, we link them together into a single object file
if [ "$doNativeLink" -eq 1 ]; then
    if [ -z "$allToBuild" ]; then
        echo "FAILED BUILD. No object files to link; allToBuild is empty." >> ./output/${outputFile}-build-last
        echo "FAILED BUILD. No object files to link."
        cat ./output/${outputFile}-build-last
        exit 1
    fi
    cd ./output
    echo "ld -r -o \"./stdlib-${targetCanonical}.o\" $allToBuild" >> "./${outputFile}-build-last"
    ld -r -o "./stdlib-${targetCanonical}.o" $allToBuild >> ./${outputFile}-build-last 2>&1
    LAST_RETURN_VALUE="$?"
    echo "-- ld returned: $LAST_RETURN_VALUE" >> "./${outputFile}-build-last"
    cd ..
    if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
        echo "FAILED BUILD."
        cat ./output/${outputFile}-build-last
        exit 1
    fi
    echo "NATIVE RELINK COMPLETE 1" >> ./output/${outputFile}-build-last
else
    echo "NATIVE RELINK SKIPPED 0" >> ./output/${outputFile}-build-last
fi
echo "-------- ALL BUILD SUCCESS" >> ./output/${outputFile}-build-last
