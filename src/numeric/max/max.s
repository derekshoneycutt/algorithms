; Get the maximum value of a sequence of numbers.
.align 4

.data
    endl: .byte 10,0
    valuesmsg:
        .ascii "values:\00"
    maxmsg:
        .ascii "max: \00"
    default1: .byte 15
    default2: .byte 10

.global main

.text

.extern ParseNumber
.extern PrintString
.extern PrintNumber
.extern StringIsInt

main:
    ; We secure a large stack for use in stack based Max algorithm
    stp x29, x30, [sp, #-256]! 
    mov x29, sp
    add x26, sp, #32

    mov x20, x0
    mov x21, x1

    ; if we have no parameters, use defaults
    cmp x20, #1
    ble .defaultValues

    ; otherwise, we need to parse the parameters
    .parseArgs:
        mov x22, #1
        mov x23, #0

    ; Loop through the arguments and parse them, storing them on the stack
    .parseArgsLoop:
        ldr x25, [x21, x22, lsl #3]

        mov x0, x25
        bl StringIsInt
        cbz x0, .continueArgsLoop
        mov x0, x25
        bl ParseNumber
        str w0, [x26, x23, lsl #2]
        add x23, x23, #1

    .continueArgsLoop:
        add x22, x22, #1
        cmp x22, x20
        blt .parseArgsLoop

        b .print

    ; If default, we justt have 2 hardcoded default values to load
    .defaultValues:
        adrp x10, default1@PAGE
        add x10, x10, default1@PAGEOFF
        ldrb w8, [x10]
        str w8, [x26]
        mov x9, 0
        adrp x11, default2@PAGE
        add x11, x11, default2@PAGEOFF
        ldrb w9, [x11]
        str w9, [x26, #4]
        mov x23, #2

    .print:
        ; To print values, we first capture the max value
        mov w0, w23
        mov x1, 0
        bl StackMax
        mov w25, w0

        ; Then we print the header
        adrp x0, valuesmsg@PAGE
        add x0, x0, valuesmsg@PAGEOFF
        bl PrintString
        adrp x0, endl@PAGE
        add x0, x0, endl@PAGEOFF
        bl PrintString

        ; And then it's a loop through each value in the stack to print them
        mov x24, #0
    .printLoop:
        ldr w19, [x26, x24, lsl #2]
        mov w0, w19
        mov x1, 0
        bl PrintNumber
        adrp x0, endl@PAGE
        add x0, x0, endl@PAGEOFF
        bl PrintString

        add x24, x24, #1
        cmp x24, x23
        bne .printLoop

        ; Finally, we print the max value
        adrp x0, maxmsg@PAGE
        add x0, x0, maxmsg@PAGEOFF
        bl PrintString
        mov x0, x25
        mov x1, 0
        bl PrintNumber
        adrp x0, endl@PAGE
        add x0, x0, endl@PAGEOFF
        bl PrintString
    .cleanup:
        ldp x29, x30, [sp], #256
        mov x0, #0
        ret

; StackMax: Get the max value from a sequence of numbers on the stack
; x0 - the number of values to check
; x1 - the current index in the stack (should start at 0)
StackMax:
    mov x2, #0
    add x3, sp, #32
    .loop:
        ldr w19, [x3, x1, lsl #2]
        add x1, x1, #1
        cmp w19, w2
        b.le .dec

        mov w2, w19

    .dec:
        sub x0, x0, #1
        cbnz x0, .loop

    mov x0, x2
    ret
