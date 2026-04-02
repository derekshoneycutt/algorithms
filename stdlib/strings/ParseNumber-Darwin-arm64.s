; Parse a number from a string;
;   0x should contain the address of the string to parse
;   0x will return the number parsed from the string

.global ParseNumber
.align 4

.text

ParseNumber:
    mov x1, x0
    mov x0, 0
    mov x10, #10

    .loop:
        ldrb w2, [x1], #1
        cbz w2, .end

        cmp w2, #'0'
        blt .loop
        cmp w2, #'9'
        bgt .loop

        mul x0, x0, x10
        sub w3, w2, #48
        add x0, x0, x3
        
        b .loop

    .end:
        ret
