        PREFIX  std:io:

# Print a string; this is super easy in MMIXAL...
#   $0 is the string pointer to print
PrintString  SWYM
        PREFIX  std:io:PrintString:
output  IS      $255
val     IS      $0
        LDA     output,val
        TRAP    0,:Fputs,:StdOut
        POP     0,0

        PREFIX  :
