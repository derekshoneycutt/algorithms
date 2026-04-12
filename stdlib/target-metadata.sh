#! /bin/sh

# Resolve stdlib native target metadata.
# Input: any target string (canonical or mixed case).
# Output globals:
#   stdlibTargetCanonical
#   stdlibTargetDebugTag
#   stdlibSourceTag
#   stdlibSourceExt
#   stdlibIncludeAllSources
resolve_stdlib_native_target_metadata() {
    metadataInputTarget="$1"
    metadataBuildTarget=$(printf '%s' "$metadataInputTarget" | tr '[:lower:]' '[:upper:]')

    stdlibTargetCanonical=""
    stdlibTargetDebugTag=""
    stdlibSourceTag=""
    stdlibSourceExt=""
    stdlibIncludeAllSources="1"

    case "$metadataBuildTarget" in
        "LINUX-X64")
            stdlibTargetCanonical="Linux-x64"
            stdlibTargetDebugTag="linuxx64"
            stdlibSourceTag="Linux-x64"
            stdlibSourceExt="asm"
            ;;
        "LINUX-X64-NASM")
            stdlibTargetCanonical="Linux-x64-nasm"
            stdlibTargetDebugTag="linuxx64nasm"
            stdlibSourceTag="Linux-x64"
            stdlibSourceExt="nasm"
            ;;
        "FREEBSD-X64")
            stdlibTargetCanonical="FreeBSD-x64"
            stdlibTargetDebugTag="freebsdx64"
            stdlibSourceTag="FreeBSD-x64"
            stdlibSourceExt="asm"
            ;;
        "FREEBSD-X64-NASM")
            stdlibTargetCanonical="FreeBSD-x64-nasm"
            stdlibTargetDebugTag="freebsdx64nasm"
            stdlibSourceTag="FreeBSD-x64"
            stdlibSourceExt="nasm"
            ;;
        "DARWIN-ARM64")
            stdlibTargetCanonical="Darwin-arm64"
            stdlibTargetDebugTag="darwinarm64"
            stdlibSourceTag="Darwin-arm64"
            stdlibSourceExt="s"
            stdlibIncludeAllSources="0"
            ;;
        "WINDOWS-X64")
            stdlibTargetCanonical="Windows-x64"
            stdlibTargetDebugTag="windowsx64"
            stdlibSourceTag="Windows-x64"
            stdlibSourceExt="asm"
            ;;
        "WINDOWS-X64-NASM")
            stdlibTargetCanonical="Windows-x64-nasm"
            stdlibTargetDebugTag="windowsx64nasm"
            stdlibSourceTag="Windows-x64"
            stdlibSourceExt="nasm"
            ;;
        *)
            return 1
            ;;
    esac

    return 0
}

# Resolve one module dispatch tuple for build-module.sh.
# Input:
#   $1 module name
#   $2 target
# Output globals:
#   stdlibModuleDispatchTarget
#   stdlibModuleOutputFile
resolve_stdlib_module_dispatch_metadata() {
    metadataModuleName="$1"
    metadataModuleTarget="$2"
    metadataBuildTarget=$(printf '%s' "$metadataModuleTarget" | tr '[:lower:]' '[:upper:]')

    stdlibModuleDispatchTarget=""
    stdlibModuleOutputFile=""

    case "$metadataBuildTarget" in
        "MMIX")
            stdlibModuleDispatchTarget="mmix"
            stdlibModuleOutputFile="${metadataModuleName}.mms"
            ;;
        "CLEAN")
            stdlibModuleDispatchTarget="clean"
            ;;
        *)
            if resolve_stdlib_native_target_metadata "$metadataBuildTarget"; then
                stdlibModuleDispatchTarget="$stdlibTargetCanonical"
                stdlibModuleOutputFile="${metadataModuleName}-${stdlibTargetCanonical}.o"
            else
                return 1
            fi
            ;;
    esac

    return 0
}