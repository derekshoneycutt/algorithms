; Prints hello to the screen

.align 4

.data
    msg: .ascii "Hello, world!\n\0"

.global main

.extern PrintString
.extern PrintNumber

.text

main:           ; The main entry point to the application
    stp x29, x30, [sp, #-16]! 
    mov x29, sp

    adrp x0, msg@PAGE
    add x0, x0, msg@PAGEOFF
    bl PrintString

    ldp x29, x30, [sp], #16
    mov x0, #0
    ret
