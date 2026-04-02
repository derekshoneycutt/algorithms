; Defines the main entry point for Darwin/MacoOS applications

.global _start
.align 4

.extern main
.extern Exit

.text

_start:
    stp x29, x30, [sp, #-16]! 
    mov x29, sp

    ; We can pass the same structure that we get on to main quite easily here
    bl main

    ; x0 is returned from main and passed immediately to Exit
    bl Exit

    ldp x29, x30, [sp], #16
    ret
