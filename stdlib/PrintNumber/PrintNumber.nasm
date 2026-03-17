DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

section .bss
    buffer resb 21

global PrintNumber

%define sys_write 1
%define stdout 1

section .text

PrintNumber:
    %define num rdi
    %define max rsi
    %define fill rdx
    %define fillb dl
    %define curr r8
    %define digit r9
    %define digitb r9b
    %define len r10
    push rbp

    mov curr, buffer + 20
    mov digit, 0
    mov byte [curr], digitb
    sub curr, 1
    mov len, 0
    push fill

    .loop:
    mov rax, num
    mov rcx, 10
    mov rdx, 0
    div rcx
    mov num, rax
    mov digit, rdx

    add digit, '0'
    mov byte [curr], digitb
    sub curr, 1
    add len, 1

    cmp num, 0
    jle .testIfMax

    cmp max, 0
    je .loop
    cmp len, max
    jg .printAndEnd
    jmp .loop

    .testIfMax:
    cmp len, max
    jge .printAndEnd

    pop fill
    mov byte [curr], fillb
    sub curr, 1
    add len, 1
    push fill
    jmp .testIfMax

    .printAndEnd:
    pop fill
    add curr, 1
    mov rsi, curr
    mov rdx, len
    mov rax, sys_write
    mov rdi, stdout
    syscall

    pop rbp
    ret
