        PREFIX  std:sys:

# Exit The Application
Exit    SET     $0,0
        SET     $255,0
        TRAP	0,:Halt,0

        PREFIX  :
