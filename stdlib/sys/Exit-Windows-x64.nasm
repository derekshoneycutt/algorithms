DEFAULT REL

global Exit

extern ExitProcess

section .text

Exit:
    call ExitProcess
    ret
