/* Defines the exit method for the application in Darwin/MacoOS */

.global Exit
.align 4

.text

.equiv sys_exit, 1
.equiv sys_16offset_posix, 0x200

.extern PrintString

Exit:
    movz x16, sys_exit
    movk x16, sys_16offset_posix, lsl #16
    svc #0x80
    ret
