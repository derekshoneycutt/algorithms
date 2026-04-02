/* Determine if a string is an integer number
 *   rdi/rcx (nix/win) is the address to the string to test
 *   rax will return 1 if it is a string of all 0-9 characters */

.global StringIsInt

.text

.if WINDOWS
    .equiv str, %rcx
.else
    .equiv str, %rdi
.endif
.equiv bret, %rax
.equiv digit, %r8
.equiv t, %rdx
.equiv tb, %dl
.equiv v, %rsi

StringIsInt:
    pushq %rbp
    movq %rsp, %rbp

    movq $0, digit
    movq $0, t
    movq $0, v

    .loop:
        movq $0, t
        movq str, %r10
        movb (%r10,%r8,1), tb
        cmpb $0, tb
        je .is_int

        cmpb $'0', tb
        jl .not_int
        cmpb $'9', tb
        jg .not_int
        incq digit
        jmp .loop

    .is_int:
        movq $1, bret
        jmp .end

    .not_int:
        movq $0, bret

    .end:
        leave
        ret
