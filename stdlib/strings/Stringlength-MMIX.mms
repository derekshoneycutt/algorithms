        PREFIX  std:strings:

# Determine the length of a string that terminates in a null char
#   $0 is the address to the string to test
#   $0 will return the number of characters before null was found
StringLength  SWYM
        PREFIX  std:strings:StringLength:
strval  IS      $0
bret    IS      $0
digit   GREG    0
t       GREG    0
        SET     digit,0
        SET     t,0

0H      LDB     t,strval,digit
        BZ      t,9F
        INCL    digit,1
        JMP     0B

9H      SET     bret,digit
        POP     1,0

        PREFIX  :
