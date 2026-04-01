; Prints hello to the screen
default rel

section .rodata
    msg: db "Hello, world!",10,0

global main

extern PrintString
extern Exit

%ifidn __OUTPUT_FORMAT__, win64
    %define param1 rcx
%else
    %define param1 rdi
%endif

section .text

main:           ; The main entry point to the application
    push rbp
    mov rbp, rsp

    mov param1, msg
    call PrintString

    xor rax, rax
    leave
    ret
