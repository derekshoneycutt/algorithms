DEFAULT REL

segment .bss
    bytesWrittenInPrintString resd 1

global PrintString

extern GetStdHandle
extern WriteConsoleA

%define STD_OUTPUT_HANDLE -11

extern StringLength

section .text

PrintString:
    %define str rdi
    push rbp
    call StringLength

    push rax
    mov rcx, STD_OUTPUT_HANDLE
    call GetStdHandle
    mov rbx, rax

    mov rcx, rbx
    mov rdx, str
    pop r8
    lea r9, [bytesWrittenInPrintString]
    sub rsp, 32
    call WriteConsoleA
    add rsp, 32

    pop rbp
    ret
