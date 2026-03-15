
# Print a number algorithm
#   $0 is the number value to print
#   $1 is the number of digits to print, including padding;
#       0 is automatic with no padding
#   $2 is the character (ASCII) to pad with, when needed
PrintNumber  SWYM
PrintNumber_output      IS      $255
PrintNumber_val         IS      $0
PrintNumber_max         IS      $1
PrintNumber_fill        IS      $2
PrintNumber_next        GREG    0
PrintNumber_curr        GREG    0
PrintNumber_count       GREG    0
PrintNumber_t           GREG    0
PrintNumber_Stack       GREG    100
        SET     PrintNumber_output,PrintNumber_Stack
        SET     PrintNumber_curr,0
        STBU    PrintNumber_curr,PrintNumber_output,0
        SUBU    PrintNumber_output,PrintNumber_output,1
        SET     PrintNumber_count,0

0H      DIV     PrintNumber_next,PrintNumber_val,10
        GET     PrintNumber_curr,:rR
        ADDU    PrintNumber_curr,PrintNumber_curr,'0'
        STBU    PrintNumber_curr,PrintNumber_output,0
        SUBU    PrintNumber_output,PrintNumber_output,1
        ADDU    PrintNumber_count,PrintNumber_count,1

        PBNP    PrintNumber_next,7F

        BZ      PrintNumber_max,1F
        CMP     PrintNumber_t,PrintNumber_count,PrintNumber_max
        BNN     PrintNumber_t,9F

1H      LDA     PrintNumber_val,PrintNumber_next
        JMP     0B

7H      CMP     PrintNumber_t,PrintNumber_count,PrintNumber_max
        BNN     PrintNumber_t,9F

8H      STBU    PrintNumber_fill,PrintNumber_output,0
        SUBU    PrintNumber_output,PrintNumber_output,1
        ADDU    PrintNumber_count,PrintNumber_count,1
        JMP     7B

9H      INCL    PrintNumber_output,1
        TRAP    0,Fputs,StdOut
        POP     0,0
