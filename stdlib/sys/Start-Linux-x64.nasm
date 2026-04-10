; Defines the main entry point for Linux applications
default rel

global _start

extern main
extern Exit

%define param1 rdi
%define param2 rsi
%define main_return rax

section .text

_start:
    ; We can pass the same structure that we get on to main quite easily here
    xor main_return, main_return
    mov param1, [rsp]
    mov param2, rsp
    add param2, 8
    call main

    mov param1, main_return
    call Exit
