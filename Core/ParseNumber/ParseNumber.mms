
# Parse a number from a string;
#   The effective $0 should contain the address of the string to parse
ParseNumber   SWYM
        PREFIX  ParseNumber:
strval  IS      $0
Pval    IS      $1
digit   IS      $2
t       IS      $3
        SET     Pval,0
        SET     digit,0

0H      LDB     t,strval,digit

        PBZ     t,9F

        MUL     Pval,Pval,10
        SUB     t,t,'0'
        ADDU    Pval,Pval,t
        INCL    digit,1
        JMP     0B

9H      LDA     $0,Pval
        PREFIX  :
        POP     1,0

