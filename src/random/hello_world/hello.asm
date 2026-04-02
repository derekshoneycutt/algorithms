/* Prints hello to the screen */

.section .rodata
    msg:
        .ascii "Hello, world!"
        .byte 10, 0

.global main

.extern PrintString
.extern Exit

.if WINDOWS
    .equiv param1, %rcx
.else
    .equiv param1, %rdi
.endif

.text

main:           /* The main entry point to the application */
    pushq %rbp
    movq %rsp, %rbp

    leaq msg(%rip), param1
    call PrintString

    xorq %rax, %rax
    leave
    ret
