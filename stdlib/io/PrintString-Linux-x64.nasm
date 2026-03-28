DEFAULT REL

global PrintString

%define sys_write 1
%define stdout 1

extern StringLength

section .text

PrintString:
    %define str rdi
    push rbp
    call StringLength
    mov rsi, str
    mov rdx, rax
    mov rax, sys_write
    mov rdi, stdout
    syscall
    pop rbp
    ret
