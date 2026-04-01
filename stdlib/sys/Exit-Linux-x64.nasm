DEFAULT REL

global Exit

%define sys_exit 60

section .text

Exit:
    mov rax, sys_exit
    syscall
    ret
