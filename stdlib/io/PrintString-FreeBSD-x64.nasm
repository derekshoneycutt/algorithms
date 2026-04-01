default rel

global PrintString

%define sys_write 4
%define stdout 1

%define syscall_num rax
%define param1 rdi
%define param2 rsi
%define param3 rdx

extern StringLength

section .text

PrintString:
    %define str rdi
    push rbp
    mov rbp, rsp

    call StringLength

    mov param2, str
    mov param3, rax
    mov syscall_num, sys_write
    mov param1, stdout
    syscall
    
    leave
    ret
