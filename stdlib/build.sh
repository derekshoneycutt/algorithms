#! /bin/sh

# This builds the standard library. A first parameter is required, which
# must be the build target.

mkdir -p ./output

BUILD_TARGET=$(echo "$1" | tr '[:lower:]' '[:upper:]')
case "$BUILD_TARGET" in
    "MMIX")
        # MMIX is just looping through each subdirectory, running build
        # in that directory, and then appending its compiled output to the
        # final output
        echo "STARTING MMIXAL BUILD" > ./output/mmixal-build-last
        echo "" > ./output/stdlib.mms
        for SUBDIR_REL in $(find . -maxdepth 1 -type d ! -name '.'); do
            SUBDIR="${SUBDIR_REL#./}"
            if [ -f "./$SUBDIR/build.sh" ]; then
                cd "./$SUBDIR"
                echo "cd $SUBDIR && ./build.sh $1 && cd .." >> ../output/mmixal-build-last
                ./build.sh $1 >> ../output/mmixal-build-last
                cd ..
                LAST_RETURN_VALUE="$?"

                # Exit immediately on any failed builds
                if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                    echo "FAILED BUILD."
                    cat ./output/mmixal-build-last
                    exit 1
                fi
                cat ./$SUBDIR/output/$SUBDIR.mms >> ./output/stdlib.mms
                cat ./$SUBDIR/output/mmixal-build-last >> ./output/mmixal-build-last
            fi
        done
        echo "ALL BUILD SUCCESS" >> ./output/mmixal-build-last
    ;;

    "LINUX-X64")
        # Linux x86 64 requires us to loop through and build each of subdirectories,
        # and then we have to link all of the packages together with ld
        echo "STARTING LINUX X86 64 BUILD" > ./output/linuxx64-build-last
        ALL_TO_BUILD=
        for SUBDIR_REL in $(find . -maxdepth 1 -type d ! -name '.'); do
            SUBDIR="${SUBDIR_REL#./}"
            if [ -f "./$SUBDIR/build.sh" ]; then
                cd "./$SUBDIR"
                echo "cd $SUBDIR && ./build.sh $1 && cd .." >> ../output/linuxx64-build-last
                ./build.sh $1 >> ../output/linuxx64-build-last
                cd ..

                # Exit immediately on any failed builds
                LAST_RETURN_VALUE="$?"
                if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                    echo "FAILED BUILD."
                    cat ./output/linuxx64-build-last
                    exit 1
                fi
                cat ./$SUBDIR/output/linuxx64-build-last >> ./output/linuxx64-build-last
                ALL_TO_BUILD="$ALL_TO_BUILD ../$SUBDIR/output/$SUBDIR-Linux-x64.o"
            fi
        done

        # If all the builds are successful, we link them together into a single object file
        cd ./output
        echo "ld -r -o \"./stdlib.o\" $ALL_TO_BUILD" >> "./linuxx64-build-last"
        ld -r -o "./stdlib-Linux-x64.o" $ALL_TO_BUILD >> ./linuxx64-build-last 2>&1
        LAST_RETURN_VALUE="$?"
        echo "-- ld returned: $LAST_RETURN_VALUE" >> "./linuxx64-build-last"
        cd ..
        if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
            echo "FAILED BUILD."
            cat ./output/linuxx64-build-last
            exit 1
        fi
        echo "ALL BUILD SUCCESS" >> ./output/linuxx64-build-last
    ;;

    "FREEBSD-X64")
        # FreeBSD x86 64 requires us to loop through and build each of subdirectories,
        # and then we have to link all of the packages together with ld
        echo "STARTING FREEBSD X86 64 BUILD" > ./output/freebsdx64-build-last
        ALL_TO_BUILD=
        for SUBDIR_REL in $(find . -maxdepth 1 -type d ! -name '.'); do
            SUBDIR="${SUBDIR_REL#./}"
            if [ -f "./$SUBDIR/build.sh" ]; then
                cd "./$SUBDIR"
                echo "cd $SUBDIR && ./build.sh $1 && cd .." >> ../output/freebsdx64-build-last
                ./build.sh $1 >> ../output/freebsdx64-build-last
                cd ..

                # Exit immediately on any failed builds
                LAST_RETURN_VALUE="$?"
                if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                    echo "FAILED BUILD."
                    cat ./output/freebsdx64-build-last
                    exit 1
                fi
                cat ./$SUBDIR/output/freebsdx64-build-last >> ./output/freebsdx64-build-last
                ALL_TO_BUILD="$ALL_TO_BUILD ../$SUBDIR/output/$SUBDIR-FreeBSD-x64.o"
            fi
        done

        # If all the builds are successful, we link them together into a single object file
        cd ./output
        echo "ld -r -o \"./stdlib.o\" $ALL_TO_BUILD" >> "./freebsdx64-build-last"
        ld -r -o "./stdlib-FreeBSD-x64.o" $ALL_TO_BUILD >> ./freebsdx64-build-last 2>&1
        LAST_RETURN_VALUE="$?"
        echo "-- ld returned: $LAST_RETURN_VALUE" >> "./freebsdx64-build-last"
        cd ..
        if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
            echo "FAILED BUILD."
            cat ./output/freebsdx64-build-last
            exit 1
        fi
        echo "ALL BUILD SUCCESS" >> ./output/freebsdx64-build-last
    ;;

    "WINDOWS-X64")
        # Windows x86 64 requires us to loop through and build each of subdirectories,
        # and then we have to link all of the packages together with ld
        echo "STARTING WINDOWS X86 64 BUILD" > ./output/windows64-build-last
        ALL_TO_BUILD=
        for SUBDIR_REL in $(find . -maxdepth 1 -type d ! -name '.'); do
            SUBDIR="${SUBDIR_REL#./}"
            if [ -f "./$SUBDIR/build.sh" ]; then
                cd "./$SUBDIR"
                echo "cd $SUBDIR && ./build.sh $1 && cd .." >> ../output/windows64-build-last
                ./build.sh $1 >> ../output/windows64-build-last
                cd ..

                # Exit immediately on any failed builds
                LAST_RETURN_VALUE="$?"
                if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
                    echo "FAILED BUILD."
                    cat ./output/windows64-build-last
                    exit 1
                fi
                cat ./$SUBDIR/output/windows64-build-last >> ./output/windows64-build-last
                ALL_TO_BUILD="$ALL_TO_BUILD ../$SUBDIR/output/$SUBDIR-Windows-x64.o"
            fi
        done

        # If all the builds are successful, we link them together into a single object file
        cd ./output
        echo "ld -r -o \"./stdlib.o\" $ALL_TO_BUILD" >> "./windows64-build-last"
        ld -lkernel32 -r -o "./stdlib-Windows-x64.o" $ALL_TO_BUILD >> ./windows64-build-last 2>&1
        LAST_RETURN_VALUE="$?"
        echo "-- ld returned: $LAST_RETURN_VALUE" >> "./windows64-build-last"
        cd ..
        if [ "$LAST_RETURN_VALUE" -ne 0 ]; then
            echo "FAILED BUILD."
            cat ./output/windows64-build-last
            exit 1
        fi
        echo "ALL BUILD SUCCESS" >> ./output/windows64-build-last
    ;;

    "CLEAN")
        # For clean, we just loop through each subdirectory and call clean there
        for SUBDIR_REL in $(find . -maxdepth 1 -type d ! -name '.'); do
            SUBDIR="${SUBDIR_REL#./}"
            if [ -f "./$SUBDIR/build.sh" ]; then
                cd "./$SUBDIR"
                ./build.sh clean
                cd ..
            fi
        done
        rm -Rf ./output
    ;;

    *) echo "Unknown target specified '$BUILD_TARGET'"; exit 2 ;;
esac
