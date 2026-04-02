/* Parse a number from a string;
 *  rdi/rcx (nix/win) should contain the address of the string to parse */

.global ParseNumber

.text

.if WINDOWS
    .equiv str, %rcx
.else
    .equiv str, %rdi
.endif
.equiv PVal, %rax
.equiv digit, %r9
.equiv t, %r8
.equiv tb, %r8b

ParseNumber:
    pushq %rbp
    movq %rsp, %rbp

    movq $0, digit
    movq $0, PVal

    .loop:
        movq $0, t
        movq str, %r10
        movb (%r10,%r9,1), tb
        cmpb $0, tb
        je .end

        movq $10, %rdx
        mulq %rdx
        subb $48, tb
        addq t, PVal
        incq digit
        jmp .loop

    .end:
        leave
        ret
