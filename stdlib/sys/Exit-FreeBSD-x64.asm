/* Defines the exit method for the application in FreeBSD */

.global Exit

.equiv sys_exit, $1

.text

Exit:
    movq sys_exit, %rax
    syscall
    ret
