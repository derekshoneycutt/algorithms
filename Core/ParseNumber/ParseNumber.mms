
# Parse a number from a string;
#   The effective $0 should contain the address of the string to parse
ParseNumber   SWYM
ParseNumber_strval  IS      $0
ParseNumber_Pval    IS      $1
ParseNumber_digit   IS      $2
ParseNumber_t       IS      $3
        SET     ParseNumber_Pval,0
        SET     ParseNumber_digit,0

0H      LDB     ParseNumber_t,ParseNumber_strval,ParseNumber_digit

        PBZ     ParseNumber_t,9F

        MUL     ParseNumber_Pval,ParseNumber_Pval,10
        SUB     ParseNumber_t,ParseNumber_t,'0'
        ADDU    ParseNumber_Pval,ParseNumber_Pval,ParseNumber_t
        INCL    ParseNumber_digit,1
        JMP     0B

9H      LDA     $0,ParseNumber_Pval
        POP     1,0
