/* Defines the main entry point for FreeBSD applications */

.global _start

.extern main
.extern Exit

.equiv param1, %rdi
.equiv param2, %rsi
.equiv main_return, %rax

.text

_start:
    /* We can pass the same structure that we get on to main quite easily here */
    xorq main_return, main_return
    movq (%rsp), param1
    leaq 8(%rsp), param2
    call main

    movq main_return, param1
    call Exit
