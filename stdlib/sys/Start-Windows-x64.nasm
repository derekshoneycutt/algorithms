; This is the startup code for Windows x64.
; It is responsible for parsing the command line arguments and calling main,
; then exiting with the return value of main.
default rel

section .bss
    argsstr: times 1000 db 0
    argvptrs: times 100 dq 0

global _start

extern main
extern Exit

extern GetCommandLineA
extern GetCommandLineW
extern CommandLineToArgvW
extern LocalFree

%define param1 rcx
%define param2 rdx
%define main_return rax

section .text

_start:
    %define currc rax
    %define currins rsi
    %define currargv rdi
    %define argc rcx
    %define argv rdx
    %define inQuotes r8
    %define currLen r9
    sub rsp, 40

    ; In Windows, we call to get the single command line string
    call GetCommandLineA

    ; Then loop through, tokenizing the string by spaces
    ; This is a pretty basic tokenization at this point
    ; It doesn't handle quotes, and only the most basic backslashes
    xor argc, argc
    xor inQuotes, inQuotes
    xor currLen, currLen
    lea argv, [argvptrs]
    lea currargv, [argvptrs]
    lea currins, [argsstr]
    mov [currargv], currins
    .tokenLoop:
        mov dl, byte [currc]
        cmp dl, 0
        je .tokenLoopDone

        cmp dl, ' '
        je .tokenSpace

        cmp dl, '\\'
        je .tokenBackslash

        mov byte [currins], dl
        inc currc
        inc currins
        inc currLen
        jmp .tokenLoop

    .tokenSpace:
        ; When we hit a space, try to terminate the current token
        cmp currLen, 0
        je .tokenSpace.skip

        mov byte [currins], 0
        inc argc
        inc currins
        xor currLen, currLen
        mov [currargv], currins
        add currargv, 8
        
        .tokenSpace.skip:
            inc currc
            jmp .tokenLoop

    .tokenBackslash:
        ; When hitting a backslash, except in the first token, write the next character whatever it is
        cmp argc, 0
        mov dl, 1
        je .tokenBackslash.writeCharacter

        inc currc
        mov dl, byte [currc]
        cmp dl, 0
        je .tokenLoopDone

        .tokenBackslash.writeCharacter:
            mov byte [currins], dl
            inc currc
            inc currins
            inc currLen
            jmp .tokenLoop

    .tokenLoopDone:
        mov byte [currins], 0
        cmp currLen, 0
        je .callMainAndExit
        inc argc
        
    .callMainAndExit:
        call main
        push main_return
    
        lea param1, [argv]
        call LocalFree

        add rsp, 40
        pop param1
        call Exit
