#! /bin/sh

# The goal here is basically just a proxy to the build-local script,
# handling any metadata and folder specific info for strings

MMIX_OUTPUT_FILE="strings.mms"
LINUX_X64_OUTPUT_FILE="strings-Linux-x64.o"
FREEBSD_X64_OUTPUT_FILE="strings-FreeBSD-x64.o"
WINDOWS_X64_OUTPUT_FILE="strings-Windows-x64.o"

BUILD_TARGET=$(echo "$1" | tr '[:lower:]' '[:upper:]')

case "$BUILD_TARGET" in
    "MMIX")
        ../build-local.sh mmix $MMIX_OUTPUT_FILE
    ;;
    "LINUX-X64")
        ../build-local.sh linux-x64 $LINUX_X64_OUTPUT_FILE
    ;;
    "FREEBSD-X64")
        ../build-local.sh freebsd-x64 $FREEBSD_X64_OUTPUT_FILE
    ;;
    "WINDOWS-X64")
        ../build-local.sh windows-x64 $WINDOWS_X64_OUTPUT_FILE
    ;;
    "CLEAN")
        ../build-local.sh clean
    ;;
    *) echo "Unknown target specified '$BUILD_TARGET'" ;;
esac
if [ $? -ne 0 ]; then
    exit 1
fi
