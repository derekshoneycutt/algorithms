#! /bin/sh

# The goal here is basically just a proxy to the build-local script,
# handling any metadata and folder specific info for sys

MMIX_OUTPUT_FILE="sys.mms"
LINUX_X64_OUTPUT_FILE="sys-Linux-x64.o"
LINUX_X64_NASM_OUTPUT_FILE="sys-Linux-x64-nasm.o"
FREEBSD_X64_NASM_OUTPUT_FILE="sys-FreeBSD-x64-nasm.o"
WINDOWS_X64_NASM_OUTPUT_FILE="sys-Windows-x64-nasm.o"

BUILD_TARGET=$(echo "$1" | tr '[:lower:]' '[:upper:]')

case "$BUILD_TARGET" in
    "MMIX")
        ../build-local.sh mmix $MMIX_OUTPUT_FILE
    ;;
    "LINUX-X64")
        ../build-local.sh linux-x64 $LINUX_X64_OUTPUT_FILE
    ;;
    "LINUX-X64-NASM")
        ../build-local.sh linux-x64-nasm $LINUX_X64_NASM_OUTPUT_FILE
    ;;
    "FREEBSD-X64-NASM")
        ../build-local.sh freebsd-x64-nasm $FREEBSD_X64_NASM_OUTPUT_FILE
    ;;
    "WINDOWS-X64-NASM")
        ../build-local.sh windows-x64-nasm $WINDOWS_X64_NASM_OUTPUT_FILE
    ;;
    "CLEAN")
        ../build-local.sh clean
    ;;
    *) echo "Unknown target specified '$BUILD_TARGET'" ;;
esac
if [ $? -ne 0 ]; then
    exit 1
fi
