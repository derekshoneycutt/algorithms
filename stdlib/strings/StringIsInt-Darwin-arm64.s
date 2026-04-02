; Determine if a string is an integer number
;   x0 is the address to the string to test
;   x0 will return 1 if it is a string of all 0-9 characters

.global StringIsInt
.align 4

.text

StringIsInt:
    mov x1, x0
    mov x0, #0

    .loop:
        ldrb w2, [x1], #1
        cbz w2, .is_int

        cmp w2, #'0'
        blt .not_int
        cmp w2, #'9'
        bgt .not_int

        b .loop

    .is_int:
        mov x0, #1

    .not_int:
        ret
