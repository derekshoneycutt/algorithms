/* Print a string; this is super easy in Windows...
 *   rcx is the string pointer to print */

.bss
    .lcomm bytesWrittenInPrintString, 4

.global PrintString

.extern GetStdHandle
.extern WriteConsoleA

.equiv STD_OUTPUT_HANDLE, $-11
.equiv param1, %rcx
.equiv param2, %rdx
.equiv param3, %r8
.equiv param4, %r9

.extern StringLength

.text

PrintString:
    .equiv str, %rcx
    pushq %rbp
    movq %rsp, %rbp

    call StringLength

    pushq str
    pushq %rax
    movq STD_OUTPUT_HANDLE, param1
    call GetStdHandle

    movq %rax, param1
    popq param3
    popq param2
    leaq bytesWrittenInPrintString(%rip), param4
    subq 32, %rsp
    call WriteConsoleA
    addq 32, %rsp

    leave
    ret
