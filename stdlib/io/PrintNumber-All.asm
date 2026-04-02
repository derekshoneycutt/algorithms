/* Print a number algorithm
 *   rdi/rcx (nix/win) is the number value to print
 *   rsi/rdx (nix/win) is the number of digits to print, including padding;
 *       0 is automatic with no padding
 *   rdx/r8 (nix/win) is the character (ASCII) to pad with, when needed */

.data
.bss
    .lcomm std_io_PrintNumber_buffer, 23

.global PrintNumber

.extern PrintString

.if WINDOWS
    .equiv param1, %rcx

    .equiv num, %rcx
    .equiv max, %rdx
    .equiv fill, %r8
    .equiv fillb, %r8b
.else
    .equiv param1, %rdi

    .equiv num, %rdi
    .equiv max, %rsi
    .equiv fill, %rdx
    .equiv fillb, %dl
.endif
.equiv curr, %r11
.equiv digit, %r9
.equiv digitb, %r9b
.equiv len, %r10

.text

PrintNumber:
    pushq %rbp
    movq %rsp, %rbp

    leaq std_io_PrintNumber_buffer+22(%rip), curr
    movq $0, digit
    movb digitb, (curr)
    decq curr
    movq $0, len
    pushq fill

    .loop:
        pushq max
        movq num, %rax
        movq $10, %rcx
        movq $0, %rdx
        divq %rcx
        movq %rax, num
        movq %rdx, digit
        popq max

        addb $'0', digitb
        movb digitb, (curr)
        decq curr
        incq len

        cmpq $0, num
        jle .testIfMax

        cmpq $0, max
        je .loop
        cmpq max, len
        jg .printAndEnd
        jmp .loop

    .testIfMax:
        cmpq max, len
        jge .printAndEnd

        popq fill
        movb fillb, (curr)
        decq curr
        incq len
        pushq fill
        jmp .testIfMax

    .printAndEnd:
        popq fill
        incq curr
        movq curr, param1
        call PrintString

        leave
        ret
