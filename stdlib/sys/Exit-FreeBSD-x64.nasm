DEFAULT REL

global Exit

%define sys_exit 1

section .text

Exit:
    mov rax, sys_exit
    syscall
    ret
