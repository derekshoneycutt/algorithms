; Print a string; this is super easy in Windows...
;   rcx is the string pointer to print
default rel

segment .bss
    bytesWrittenInPrintString resd 1

global PrintString

extern GetStdHandle
extern WriteConsoleA

%define STD_OUTPUT_HANDLE -11
%define param1 rcx
%define param2 rdx
%define param3 r8
%define param4 r9

extern StringLength

section .text

PrintString:
    %define str rcx
    push rbp
    mov rbp, rsp

    call StringLength

    push str
    push rax
    mov param1, STD_OUTPUT_HANDLE
    call GetStdHandle

    mov param1, rax
    pop param3
    pop param2
    lea param4, [bytesWrittenInPrintString]
    sub rsp, 32
    call WriteConsoleA
    add rsp, 32

    leave
    ret
