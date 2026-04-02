/* Calculate the GCD between 2 values and print it all to the screen. */

.section .rodata
    space:
        .ascii " "
        .byte 0
    endl: .byte 10,0
    gcdmsg:
        .ascii "gcd: "
        .byte 0
    default_m: .byte 15
    default_n: .byte 10

.global main

.text

.extern ParseNumber
.extern PrintString
.extern PrintNumber
.extern StringIsInt

.if WINDOWS
    .equiv param1, %rcx
    .equiv param2, %rdx

    .equiv argc, %rcx
    .equiv argv, %rdx
.else
    .equiv param1, %rdi
    .equiv param2, %rsi

    .equiv argc, %rdi
    .equiv argv, %rsi
.endif

main:
    .equ m, %r8
    .equ mb, %r8b
    .equ n, %r9
    .equ nb, %r9b
    pushq %rbp
    movq %rsp, %rbp

    movq $0, m
    movzbq default_m(%rip), m
    movq $0, n
    movzbq default_n(%rip), n

/* Check if we have 2+ command line arguments (we use 2 only)
 * If 2, we need to parse them; else use defaults */
    cmpq $3, argc
    jl .print

    pushq argv
    movq 8(argv), param1
    call StringIsInt
    popq argv
    cmp $0, %rax
    je .print
    pushq argv
    movq 16(argv), param1
    call StringIsInt
    popq argv
    cmp $0, %rax
    je .print

    pushq argv
    movq 8(argv), param1
    call ParseNumber
    movq $0, m
    movq %rax, m
    popq argv

    pushq m
    pushq argv
    movq 16(argv), param1
    call ParseNumber
    movq $0, n
    movq %rax, n
    popq argv
    popq m

    .print:
    /* Print the given 2 values */
        pushq m
        pushq n
        movq m, param1
        movq $0, param2
        call PrintNumber
        leaq space(%rip), param1
        call PrintString
        movq (%rsp), n
        movq n, param1
        movq $0, param2
        call PrintNumber
        leaq endl(%rip), param1
        call PrintString
        popq n
        popq m

    /* Calculate the GCD with Euclid's */
        movq m, param1
        movq n, param2
        call euclidgcd
        movq %rax, %r11

    /* Print and exit */
        pushq %r11
        pushq %rax
        leaq gcdmsg(%rip), param1
        call PrintString
        popq param1
        popq %r11
        movq %r11, param1
        movq $0, param2
        call PrintNumber
        leaq endl(%rip), param1
        call PrintString

        xorq %rax, %rax
        leave
        ret

/* Euclid's Algorithm */
euclidgcd:
    .equ m, %rdi
    .equ n, %rsi
.if WINDOWS
    mov %rcx, m
    mov %rdx, n
.endif
    .equ r, %rdx
    .loop:
        movq m, %rax
        movq $0, %rdx
        divq n
        movq n, m
        movq r, n

        cmpq $0, n
        jne .loop

    movq m, %rax
    ret
