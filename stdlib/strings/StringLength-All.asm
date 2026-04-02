/* Determine the length of a string that terminates in a null char
 *  rdi/rcx (nix/win) is the address to the string to test
 *   rax will return the number of characters before null was found */

.global StringLength

.text

.if WINDOWS
    .equiv str, %rcx
.else
    .equiv str, %rdi
.endif
.equiv digit, %rax
.equiv t, %r8
.equiv tb, %r8b

StringLength:
    pushq %rbp
    movq %rsp, %rbp

    movq $0, digit
    movq $0, t

    .loop:

        mov str, %r10
        movb (%r10,%rax,1), tb
        cmpb $0, tb
        je .end

        incq digit
        jmp .loop

    .end:
        leave
        ret
