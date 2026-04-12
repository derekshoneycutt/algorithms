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

scriptDir=$(CDPATH= cd -- "$(dirname "$0")" && pwd -P)
if [ ! -r "$scriptDir/target-metadata.sh" ]; then
    echo "Required file missing or unreadable: $scriptDir/target-metadata.sh"
    exit 78
fi
. "$scriptDir/target-metadata.sh" || exit 78

mkdir -p ./output

# Keep explicit module list so main scripts do not depend on subdirectory build.sh files.
stdlibModules="io strings sys"

# Add one path to an archive list only when it exists on disk.
add_stdlib_archive_entry_if_exists() {
    archiveListFile="$1"
    archivePath="$2"
    if [ -e "$archivePath" ]; then
        archivePathRel=${archivePath#./}
        printf '%s\n' "$archivePathRel" >> "$archiveListFile"
    fi
}

# Build a per-target native stdlib archive matching assembly run archive content.
create_stdlib_native_archive() {
    targetCanonical="$1"
    sourceTag="$2"
    sourceExt="$3"
    debugTag="$4"
    includeAllSources="$5"

    archiveFile="./output/stdlib-${targetCanonical}-archive.tar.gz"
    archiveListFile=$(mktemp "${TMPDIR:-/tmp}/stdlib-archive.XXXXXX") || return 1
    : > "$archiveListFile"

    for stdlibSub in $stdlibModules; do
        for stdlibSource in "./$stdlibSub"/*-"$sourceTag"."$sourceExt"; do
            [ -f "$stdlibSource" ] || continue
            add_stdlib_archive_entry_if_exists "$archiveListFile" "$stdlibSource"
        done

        if [ "$includeAllSources" = "1" ]; then
            for stdlibSource in "./$stdlibSub"/*-All."$sourceExt"; do
                [ -f "$stdlibSource" ] || continue
                add_stdlib_archive_entry_if_exists "$archiveListFile" "$stdlibSource"
            done
        fi

        for stdlibObject in "./$stdlibSub/output"/*-"$targetCanonical".o; do
            [ -f "$stdlibObject" ] || continue
            add_stdlib_archive_entry_if_exists "$archiveListFile" "$stdlibObject"
        done

        add_stdlib_archive_entry_if_exists "$archiveListFile" "./$stdlibSub/output/${debugTag}-build-last"
    done

    add_stdlib_archive_entry_if_exists "$archiveListFile" "./output/stdlib-${targetCanonical}.o"
    add_stdlib_archive_entry_if_exists "$archiveListFile" "./output/${debugTag}-build-last"

    if [ ! -s "$archiveListFile" ]; then
        rm -f "$archiveListFile"
        return 1
    fi

    sort -u "$archiveListFile" -o "$archiveListFile"
    tar -czf "$archiveFile" -T "$archiveListFile"
    archiveRet="$?"
    rm -f "$archiveListFile"
    return "$archiveRet"
}

# Build the MMIX stdlib archive with MMIX sources, outputs, and build logs.
create_stdlib_mmix_archive() {
    archiveFile="./output/stdlib-mmix-archive.tar.gz"
    archiveListFile=$(mktemp "${TMPDIR:-/tmp}/stdlib-archive.XXXXXX") || return 1
    : > "$archiveListFile"

    for stdlibSub in $stdlibModules; do
        for stdlibSource in "./$stdlibSub"/*.mms; do
            [ -f "$stdlibSource" ] || continue
            add_stdlib_archive_entry_if_exists "$archiveListFile" "$stdlibSource"
        done

        for stdlibOutput in "./$stdlibSub/output"/*.mms; do
            [ -f "$stdlibOutput" ] || continue
            add_stdlib_archive_entry_if_exists "$archiveListFile" "$stdlibOutput"
        done

        add_stdlib_archive_entry_if_exists "$archiveListFile" "./$stdlibSub/output/mmixal-build-last"
    done

    add_stdlib_archive_entry_if_exists "$archiveListFile" "./output/stdlib.mms"
    add_stdlib_archive_entry_if_exists "$archiveListFile" "./output/mmixal-build-last"

    if [ ! -s "$archiveListFile" ]; then
        rm -f "$archiveListFile"
        return 1
    fi

    sort -u "$archiveListFile" -o "$archiveListFile"
    tar -czf "$archiveFile" -T "$archiveListFile"
    archiveRet="$?"
    rm -f "$archiveListFile"
    return "$archiveRet"
}

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

        for SUBDIR in $stdlibModules; do
            [ -d "./$SUBDIR" ] || continue
            cd "./$SUBDIR" || { echo "FAILED BUILD. cd into ./$SUBDIR failed."; exit 1; }
            echo "cd $SUBDIR && sh ../build-module.sh $SUBDIR $1 && cd .." >> ../output/mmixal-build-last
            sh ../build-module.sh "$SUBDIR" "$1" >> ../output/mmixal-build-last 2>&1
            lastReturnValue="$?"
            cd ..

            # Exit immediately on any failed builds
            if [ "$lastReturnValue" -ne 0 ]; then
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
        done

        if [ "$DO_MMIX_COMBINE" -eq 1 ]; then
            : > ./output/stdlib.mms
            for SUBDIR in $stdlibModules; do
                [ -d "./$SUBDIR" ] || continue
                echo "cat ./$SUBDIR/output/$SUBDIR.mms >> ./output/stdlib.mms" >> ./output/mmixal-build-last
                cat ./$SUBDIR/output/$SUBDIR.mms >> ./output/stdlib.mms
                cat_ret="$?"
                if [ "$cat_ret" -ne 0 ]; then
                    echo "FAILED BUILD. MMIX merge failed for ./$SUBDIR/output/$SUBDIR.mms (returned $cat_ret)" >> ./output/mmixal-build-last
                    cat ./output/mmixal-build-last
                    exit "$cat_ret"
                fi
            done
            echo "MMIXAL COMBINE COMPLETE 1" >> ./output/mmixal-build-last
        else
            echo "MMIXAL COMBINE SKIPPED 0" >> ./output/mmixal-build-last
        fi

        echo "ALL BUILD SUCCESS" >> ./output/mmixal-build-last
    ;;

    "CLEAN")
        # For clean, we loop through each subdirectory and call clean there.
        # Continue even if one sub-clean fails, but return non-zero at the end.
        clean_ret=0
        for SUBDIR in $stdlibModules; do
            [ -d "./$SUBDIR" ] || continue
            cd "./$SUBDIR" || { echo "WARNING: cd into ./$SUBDIR failed; skipping."; clean_ret=1; continue; }
            sh ../build-module.sh "$SUBDIR" clean
            sub_clean_ret="$?"
            cd ..
            if [ "$sub_clean_ret" -ne 0 ]; then
                echo "WARNING: clean failed in ./$SUBDIR (returned $sub_clean_ret)"
                if [ "$clean_ret" -eq 0 ]; then
                    clean_ret="$sub_clean_ret"
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

    *)
        if resolve_stdlib_native_target_metadata "$buildTarget"; then
            ./build-native.sh "$1" "$stdlibTargetDebugTag"
        else
            echo "Unknown target specified '$buildTarget'"
            exit 2
        fi
    ;;
esac

build_ret="$?"
if [ "$build_ret" -ne 0 ]; then
    exit "$build_ret"
fi

# After a successful stdlib build, write or update the target-specific stdlib archive.
archive_ret=0
if [ "$buildTarget" = "MMIX" ]; then
    create_stdlib_mmix_archive
    archive_ret="$?"
elif resolve_stdlib_native_target_metadata "$buildTarget"; then
    create_stdlib_native_archive "$stdlibTargetCanonical" "$stdlibSourceTag" "$stdlibSourceExt" "$stdlibTargetDebugTag" "$stdlibIncludeAllSources"
    archive_ret="$?"
fi

if [ "$archive_ret" -ne 0 ]; then
    echo "WARNING: failed to create stdlib archive for target '$buildTarget'"
fi

exit "$build_ret"
