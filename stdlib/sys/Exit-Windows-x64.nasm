; Defines the exit method for the application in Windows
default rel

global Exit

extern ExitProcess

section .text

Exit:
    call ExitProcess
    ret
