; Defines the exit method for the application in FreeBSD
default rel

global Exit

%define sys_exit 1

section .text

Exit:
    mov rax, sys_exit
    syscall
    ret
