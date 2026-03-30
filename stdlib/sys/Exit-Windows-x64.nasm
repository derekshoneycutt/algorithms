DEFAULT REL

global Exit

extern ExitProcess

section .text

Exit:
    xor ecx, ecx
    call ExitProcess
    ret
