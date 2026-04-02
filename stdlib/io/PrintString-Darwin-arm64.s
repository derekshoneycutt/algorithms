; Print a string; this is super easy in FreeBSD...
;   0x is the string pointer to print

.global PrintString
.align 4

.equiv sys_write, 4
.equiv sys_16offset_posix, 0x200
.equiv stdout, 1

.extern StringLength

.text

PrintString:
    stp x29, x30, [sp, #-16]! 
    mov x29, sp

    mov x5, x0
    bl StringLength

    mov x2, x0
    mov x0, stdout
    mov x1, x5
    movz x16, sys_write
    movk x16, sys_16offset_posix, lsl #16
    svc #0x80
    
    ldp x29, x30, [sp], #16
    ret
