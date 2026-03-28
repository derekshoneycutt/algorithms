# This prints hello to the screen
        LOC	Data_Segment
        GREG	@
Text    BYTE	"Hello, world!",10,0

        LOC     #100
Main    LDA     $1,Text               # The main entry point to the application
        PUSHJ   0,std:io:PrintString  // Put string to Std Out
        JMP     std:sys:Exit          % Exit the application
