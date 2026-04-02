; Print a number algorithm
;   x0 is the number value to print
;   x1 is the number of digits to print, including padding;
;       0 is automatic with no padding
;   x2 is the character (ASCII) to pad with, when needed

.align 4

.bss
    std_io_PrintNumber_buffer: .skip 23

.global PrintNumber

.extern PrintString

.text

PrintNumber:
    stp x29, x30, [sp, #-16]! 
    mov x29, sp

    mov x10, x0
    mov x11, x1
    mov x12, x2

    adrp x0, std_io_PrintNumber_buffer@GOTPAGE
    ldr x0, [x0, std_io_PrintNumber_buffer@GOTPAGEOFF]
    add x0, x0, #22
    strb wzr, [x0]
    sub x0, x0, #1

    mov x1, 0

    .loop:
        mov x5, #10
        udiv x6, x10, x5
        msub x9, x6, x5, x10
        mov x10, x6

        add x9, x9, #'0'
        strb w9, [x0]
        sub x0, x0, #1
        add x1, x1, #1

        cbz x10, .testIfMax

        cbz x11, .loop

        cmp x1, x11
        bgt .printAndEnd

        b .loop

    .testIfMax:
        cmp x1, x11
        bge .printAndEnd

        strb w12, [x0]
        sub x0, x0, #1
        add x1, x1, #1
        b .testIfMax

    .printAndEnd:
        add x0, x0, #1
        bl PrintString
        
        ldp x29, x30, [sp], #16
        ret
