/* Print a string; this is super easy in Linux...
 *  rdi is the string pointer to print */

.global PrintString

.equiv sys_write, 1
.equiv stdout, 1

.equiv syscall_num, %rax
.equiv param1, %rdi
.equiv param2, %rsi
.equiv param3, %rdx

.equiv str, %rdi

.extern StringLength

.text

PrintString:
    pushq %rbp
    movq %rsp, %rbp

    call StringLength

    movq str, param2
    movq %rax, param3
    movq $sys_write, syscall_num
    movq $stdout, param1
    syscall
    
    leave
    ret
