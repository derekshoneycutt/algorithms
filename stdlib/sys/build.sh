#! /bin/sh

# The goal here is basically just a proxy to the build-local script,
# handling any metadata and folder specific info for sys

mmixOutputFile="sys.mms"
linuxX64OutputFile="sys-Linux-x64.o"
linuxX64NasmOutputFile="sys-Linux-x64-nasm.o"
freebsdX64OutputFile="sys-FreeBSD-x64.o"
freebsdX64NasmOutputFile="sys-FreeBSD-x64-nasm.o"
darwinArm64OutputFile="sys-Darwin-arm64.o"
windowsX64OutputFile="sys-Windows-x64.o"
windowsX64NasmOutputFile="sys-Windows-x64-nasm.o"

buildTarget=$(echo "$1" | tr '[:lower:]' '[:upper:]')

case "$buildTarget" in
    "MMIX")
        ../build-local.sh mmix "$mmixOutputFile"
    ;;
    "LINUX-X64")
        ../build-local.sh Linux-x64 "$linuxX64OutputFile"
    ;;
    "LINUX-X64-NASM")
        ../build-local.sh Linux-x64-nasm "$linuxX64NasmOutputFile"
    ;;
    "FREEBSD-X64")
        ../build-local.sh FreeBSD-x64 "$freebsdX64OutputFile"
    ;;
    "FREEBSD-X64-NASM")
        ../build-local.sh FreeBSD-x64-nasm "$freebsdX64NasmOutputFile"
    ;;
    "DARWIN-ARM64")
        ../build-local.sh Darwin-arm64 "$darwinArm64OutputFile"
    ;;
    "WINDOWS-X64")
        ../build-local.sh Windows-x64 "$windowsX64OutputFile"
    ;;
    "WINDOWS-X64-NASM")
        ../build-local.sh Windows-x64-nasm "$windowsX64NasmOutputFile"
    ;;
    "CLEAN")
        ../build-local.sh clean
    ;;
    *) echo "Unknown target specified '$buildTarget'"; exit 2 ;;
esac
