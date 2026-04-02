/* Defines the exit method for the application in Windows */

.global Exit

.extern ExitProcess

.text

Exit:
    call ExitProcess
    ret
