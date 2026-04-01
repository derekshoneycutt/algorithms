DEFAULT REL

global StringLength

section .text

StringLength:
    %ifidn __OUTPUT_FORMAT__, win64
        %define str rcx
    %else
        %define str rdi
    %endif
    %define digit rax
    %define t r8
    %define tb r8b
    push rbp
    mov rbp, rsp

    mov digit, 0
    mov t, 0

    .loop:
    mov tb, [str + digit]
    cmp tb, 0
    je .end

    inc digit
    jmp .loop

    .end:
    leave
    ret
