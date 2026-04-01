
default rel

section .bss
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

    ; We don't handle unicode right now, but
    ; this gives us the first character of each paramter
    call GetCommandLineW
    mov param1, main_return
    lea param2, [argc]
    call CommandLineToArgvW
    mov [argv], main_return

    xor main_return, main_return
    mov param1, [argc]
    mov param2, [argv]
    call main
    push main_return
    
    lea param1, [argv]
    call LocalFree

    add rsp, 40

    pop param1
    call Exit
