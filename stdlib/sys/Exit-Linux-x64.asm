/* Defines the exit method for the application in Linux */

.global Exit

.equiv sys_exit, 60

.text

Exit:
    movq $sys_exit, %rax
    syscall
    ret
