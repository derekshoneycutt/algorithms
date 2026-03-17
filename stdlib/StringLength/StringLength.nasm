DEFAULT REL

section .note.GNU-stack noalloc noexec nowrite progbits

global StringLength

section .text

StringLength:
    %define str rdi
    %define digit r9
    %define t r10
    %define tb r10b
    mov digit, 0

    .loop:
    mov t, 0
    mov tb, [str + digit]
    cmp tb, 0
    je .end

    add digit, 1
    jmp .loop

    .end:
    mov rax, digit
    ret
