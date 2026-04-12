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

scriptDir=$(CDPATH= cd -- "$(dirname "$0")" && pwd -P)
if [ ! -r "$scriptDir/target-metadata.sh" ]; then
    echo "Required file missing or unreadable: $scriptDir/target-metadata.sh"
    exit 78
fi
. "$scriptDir/target-metadata.sh" || exit 78

target=$1
outputFile=$2
buildTarget=$(printf '%s' "$target" | tr '[:lower:]' '[:upper:]')
targetCanonical=""
if resolve_stdlib_native_target_metadata "$buildTarget"; then
    targetCanonical="$stdlibTargetCanonical"
else
    targetCanonical="$target"
fi
mkdir -p ./output

# Keep explicit module list so native build orchestration does not depend on per-subdir build.sh scripts.
stdlibModules="io strings sys"

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

for SUBDIR in $stdlibModules; do
    [ -d "./$SUBDIR" ] || continue
    cd "./$SUBDIR" || { echo "FAILED BUILD. cd into ./$SUBDIR failed."; cat ../output/${outputFile}-build-last; exit 1; }
    echo "cd $SUBDIR && sh ../build-module.sh $SUBDIR $targetCanonical && cd .." >> ../output/${outputFile}-build-last
    sh ../build-module.sh "$SUBDIR" "$targetCanonical" >> ../output/${outputFile}-build-last 2>&1
    lastReturnValue="$?"
    cd ..

    # Exit immediately on any failed builds
    if [ "$lastReturnValue" -ne 0 ]; then
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
    echo "ld -v -r -o \"./stdlib-${targetCanonical}.o\" $allToBuild" >> "./${outputFile}-build-last"
    ld -v -r -o "./stdlib-${targetCanonical}.o" $allToBuild >> ./${outputFile}-build-last 2>&1
    lastReturnValue="$?"
    echo "-- ld returned: $lastReturnValue" >> "./${outputFile}-build-last"
    cd ..
    if [ "$lastReturnValue" -ne 0 ]; then
        echo "FAILED BUILD."
        cat ./output/${outputFile}-build-last
        exit 1
    fi
    echo "NATIVE RELINK COMPLETE 1" >> ./output/${outputFile}-build-last
else
    echo "NATIVE RELINK SKIPPED 0" >> ./output/${outputFile}-build-last
fi
echo "-------- ALL BUILD SUCCESS" >> ./output/${outputFile}-build-last
