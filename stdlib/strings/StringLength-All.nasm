DEFAULT REL

global StringLength

section .text

StringLength:
    %define str rdi
    %define digit rax
    %define t rcx
    %define tb cl
    mov digit, 0
    mov t, 0

    .loop:
    mov tb, [str + digit]
    cmp tb, 0
    je .end

    inc digit
    jmp .loop

    .end:
    ret
