
default rel

seciton .bss
    argc: resq 1
    argv: resq 1

global _start

extern main
extern Exit

extern GetCommandLineW
extern CommandLineToArgvW
extern LocalFree

%define param1 rcx
%define param2 rdx
%define main_return rax

section .text

_start:
    sub rsp, 40

    call GetCommandLineW
    lea param2, [argc]
    mov param1, main_return
    call CommandLineToArgvW
    mov [argv], main_return

    xor main_return, main_return
    mov param1, [argc]
    mov param2, argv
    call main

    mov param1, [argv]

    mov param1, main_return
    call Exit
