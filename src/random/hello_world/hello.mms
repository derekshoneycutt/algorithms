# This prints hello to the screen

        LOC	Data_Segment
        GREG	@
Text    BYTE	"Hello, world!",10,0

        LOC     #100
Main    LDA     $255,Text       ; The main entry point to the application
        TRAP	0,Fputs,StdOut
        TRAP	0,Halt,0
