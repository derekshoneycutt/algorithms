#! /bin/sh

# The goal here is basically just a proxy to the build-local script,
# handling any metadata and folder specific info for io

mmixOutputFile="io.mms"
linuxX64OutputFile="io-Linux-x64.o"
linuxX64NasmOutputFile="io-Linux-x64-nasm.o"
freebsdX64OutputFile="io-FreeBSD-x64.o"
freebsdX64NasmOutputFile="io-FreeBSD-x64-nasm.o"
darwinArm64OutputFile="io-Darwin-arm64.o"
windowsX64OutputFile="io-Windows-x64.o"
windowsX64NasmOutputFile="io-Windows-x64-nasm.o"

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
