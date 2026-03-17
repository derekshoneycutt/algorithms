
# Determine if a string is an integer number
#   $0 is the address to the string to test
#   $0 will return 1 if it is a string of all 0-9 characters
StringIsInt  SWYM
        PREFIX  StringIsInt:
strval  IS      $0
bret    IS      $0
digit   GREG    0
t       GREG    0
v       GREG    0
        SET     digit,0
        SET     t,0
        SET     v,0

0H      LDB     t,strval,digit
        BZ      t,7F
        CMP     v,t,'0'
        BN      v,8F
        CMP     v,t,'9'
        BP      v,8F
        INCL    digit,1
        JMP     0B

7H      SET     bret,1
        JMP     9F

8H      SET     bret,0

9H      SWYM
        PREFIX  :
        POP     1,0