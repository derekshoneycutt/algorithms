
# Print a string; this is super easy in MMIXAL...
#   $0 is the string pointer to print
PrintString  SWYM
        PREFIX  PrintString:
output  IS      $255
val     IS      $0
        LDA     output,val
        PREFIX  :
        TRAP    0,Fputs,StdOut
        POP     0,0
