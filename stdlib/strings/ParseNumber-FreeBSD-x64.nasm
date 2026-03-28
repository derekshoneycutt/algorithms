DEFAULT REL

global ParseNumber

section .text

ParseNumber:
    %define str rdi
    %define PVal rax
    %define digit rcx
    %define t r8
    %define tb r8b
    mov digit, 0
    mov PVal, 0

    .loop:
    mov t, 0
    mov tb, [str + digit]
    cmp tb, 0
    je .end

    mov rdx, 10
    mul rdx
    sub t, 48
    add PVal, t
    inc digit
    jmp .loop

    .end:
    ret
