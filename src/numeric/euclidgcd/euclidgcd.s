; Calculate the GCD between 2 values and print it all to the screen.
.align 4

.data
    space: .byte ' ',0
    endl: .byte 10,0
    gcdmsg:
        .ascii "gcd: \00"
    default_m: .byte 15
    default_n: .byte 10

.global main

.text

.extern ParseNumber
.extern PrintString
.extern PrintNumber
.extern StringIsInt

main:
    stp x29, x30, [sp, #-32]! 
    mov x29, sp

    mov x15, x1
    adrp x10, default_m@PAGE
    add x10, x10, default_m@PAGEOFF
    ldrb w8, [x10]
    mov x9, 0
    adrp x11, default_n@PAGE
    add x11, x11, default_n@PAGEOFF
    ldrb w9, [x11]

; Check if we have 2+ command line arguments (we use 2 only)
; If 2, we need to parse them; else use defaults
    cmp x0, #2
    ble .print

    ldr x0, [x15, #8]
    bl StringIsInt
    cbz x0, .print
    ldr x0, [x15, #16]
    bl StringIsInt
    cbz x0, .print

    ldr x0, [x15, #8]
    bl ParseNumber
    mov w8, w0

    ldr x0, [x15, #16]
    bl ParseNumber
    mov w9, w0

    .print:
    ; Print the given 2 values
    ;  Store m and n on the stack so they're safe
        str w8, [sp]
        str w9, [sp, #4]
        mov w0, w8
        mov x1, 0
        bl PrintNumber
        adrp x0, space@PAGE
        add x0, x0, space@PAGEOFF
        bl PrintString
        ldr w0, [sp, #4]
        mov x1, 0
        bl PrintNumber
        adrp x0, endl@PAGE
        add x0, x0, endl@PAGEOFF
        bl PrintString

    ; Calculate the GCD with Euclid's
        ldr w0, [sp]
        ldr w1, [sp, #4]
        bl euclidgcd
        mov x11, x0

    ; Print and exit
        adrp x0, gcdmsg@PAGE
        add x0, x0, gcdmsg@PAGEOFF
        bl PrintString
        mov x0, x11
        mov x1, 0
        bl PrintNumber
        adrp x0, endl@PAGE
        add x0, x0, endl@PAGEOFF
        bl PrintString

        ldp x29, x30, [sp], #32
        mov x0, #0
        ret

; Euclid's Algorithm
euclidgcd:
    .loop:
        udiv x2, x0, x1
        msub x3, x2, x1, x0
        mov x0, x1
        mov x1, x3
        cbz x1, .done
        b .loop

    .done:
        ret
