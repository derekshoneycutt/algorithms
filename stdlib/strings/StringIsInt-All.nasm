; Determine if a string is an integer number
;   rdi/rcx (nix/win) is the address to the string to test
;   rax will return 1 if it is a string of all 0-9 characters
default rel

global StringIsInt

section .text

StringIsInt:
    %ifidn __OUTPUT_FORMAT__, win64
        %define str rcx
    %else
        %define str rdi
    %endif
    %define bret rax
    %define digit r8
    %define t rdx
    %define tb dl
    %define v rsi
    push rbp
    mov rbp, rsp

    mov digit, 0
    mov t, 0
    mov v, 0

    .loop:
        mov t, 0
        mov tb, [str + digit]
        cmp tb, 0
        je .is_int

        cmp tb, '0'
        jl .not_int
        cmp tb, '9'
        jg .not_int
        inc digit
        jmp .loop

    .is_int:
        mov bret, 1
        jmp .end

    .not_int:
        mov bret, 0

    .end:
        leave
        ret
