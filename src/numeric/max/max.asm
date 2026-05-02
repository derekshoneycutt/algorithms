/* Find the maximum value of a sequence of numbers */

.section .rodata
    space:
        .ascii " "
        .byte 0
    endl: .byte 10,0
    valuesmsg:
        .ascii "values: "
        .byte 10,0
    maxmsg:
        .ascii "max: "
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
    .equ argvp, %r10
    .equ argp, %r9
    .equ count, %r8
    pushq %rbp
    movq %rsp, %rbp

    /* If we have no parameters, load the default values */
    cmpq $1, argc
    jle .defaultValues

    /* If we have arguments, loop through, parsing each into an integer value on the stack */
    .parseArgs:
        mov $0, argvp
        mov $0, count

    .parseArgsLoop:
        add $1, argvp
        mov (argv,argvp,8), argp

        pushq argc
        pushq argv
        pushq argvp
        pushq count
        push argp
        mov argp, param1
        call StringIsInt
        pop param1
        cmp $0, %rax
        je .continueSkipping
        call ParseNumber
        pop count
        pop argvp
        pop argv
        pop argc

        pushq %rax
        inc count
        jmp .continueArgsLoop

    .continueSkipping:
        pop count
        pop argvp
        pop argv
        pop argc

    .continueArgsLoop:
        dec argc

        cmp $1, argc
        jg .parseArgsLoop

        pushq count
        jmp .print

    /* For default values, just load the 2 and set the counter on top of the stack */
    .defaultValues:
        mov $0, %rcx
        mov default_m(%rip), %rcx
        pushq %rcx
        mov $0, %rcx
        mov default_n(%rip), %rcx
        pushq %rcx
        mov $2, count
        pushq count

    .print:
        /* We calculate the max of all entered values to start */
        popq count
        mov count, param1
        mov $0, param2
        call StackMax
        .equ themax, %rax

        /* Once we have the max, print the values, then the max */
        pushq count
        pushq themax
        leaq valuesmsg(%rip), %rdi
        call PrintString
        popq themax
        popq count

        .equ printCount, %r9
        mov $0, printCount
    .printLoop:
        popq param1
        pushq themax
        pushq count
        pushq printCount
        mov $0, param2
        call PrintNumber
        leaq endl(%rip), param1
        call PrintString
        popq printCount
        popq count
        popq themax
        inc printCount
        cmp printCount, count
        jg .printLoop

        pushq themax
        leaq maxmsg(%rip), param1
        call PrintString
        popq param1
        mov $0, param2
        call PrintNumber
        leaq endl(%rip), param1
        call PrintString

    xor %rax, %rax
    leave
    ret

/* Find the maximum value in n values on the stack; this does not pop off the stack. */
StackMax:
    .equ n, %rdi
    .equ curr, %rsi
.if WINDOWS
    mov %rcx, n
    mov %rdx, curr
.endif
    .equ max, %rax
    .equ test, %rcx
    mov $0, max
    .loop:
        inc curr
        mov (%rsp,curr,8), test

        cmp max, test
        jl .dec

        mov test, max
    .dec:
        dec n
        cmp $0, n
        jg .loop

    ret
