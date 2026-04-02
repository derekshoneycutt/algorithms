; Determine the length of a string that terminates in a null char
;  x0 is the address to the string to test
;  x0 will return the number of characters before null was found

.global StringLength
.align 4

.text

StringLength:
    mov x1, x0
    mov x0, #0

    .loop:
        ldrb w2, [x1], #1
        cbz w2, .end
        add x0, x0, #1
        b .loop

    .end:
        ret
