; Parse a number from a string;
;   rdi/rcx (nix/win) should contain the address of the string to parse
default rel

global ParseNumber

section .text

ParseNumber:
    %ifidn __OUTPUT_FORMAT__, win64
        %define str rcx
    %else
        %define str rdi
    %endif
    %define PVal rax
    %define digit r9
    %define t r8
    %define tb r8b
    push rbp
    mov rbp, rsp

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
        leave
        ret
