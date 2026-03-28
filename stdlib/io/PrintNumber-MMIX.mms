        PREFIX std:io:

# Print a number algorithm
#   $0 is the number value to print
#   $1 is the number of digits to print, including padding;
#       0 is automatic with no padding
#   $2 is the character (ASCII) to pad with, when needed
PrintNumber  SWYM
        PREFIX  std:io:PrintNumber:
output  IS      $255
val     IS      $0
max     IS      $1
fill    IS      $2
next    GREG    0
curr    GREG    0
count   GREG    0
t       GREG    0
Stack   GREG    100
        SET     output,Stack
        SET     curr,0
        STBU    curr,output,0
        SUBU    output,output,1
        SET     count,0

0H      DIV     next,val,10
        GET     curr,:rR
        ADDU    curr,curr,'0'
        STBU    curr,output,0
        SUBU    output,output,1
        ADDU    count,count,1

        PBNP    next,7F

        BZ      max,1F
        CMP     t,count,max
        BNN     t,9F

1H      LDA     val,next
        JMP     0B

7H      CMP     t,count,max
        BNN     t,9F

8H      STBU    fill,output,0
        SUBU    output,output,1
        ADDU    count,count,1
        JMP     7B

9H      INCL    output,1
        TRAP    0,:Fputs,:StdOut
        POP     0,0

        PREFIX  :

