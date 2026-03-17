DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

global ParseNumber

section .text

ParseNumber:
    %define str rdi
    %define PVal r8
    %define digit r9
    %define t r10
    %define tb r10b
    mov digit, 0
    mov PVal, 0

    .loop:
    mov t, 0
    mov tb, [str + digit]
    cmp tb, 0
    je .end

    mov rax, PVal
    mov rcx, 10
    mul rcx
    mov PVal, rax
    sub t, 48
    add PVal, t
    add digit, 1
    jmp .loop

    .end:
    mov rax, PVal
    ret
