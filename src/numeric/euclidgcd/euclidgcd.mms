        LOC	Data_Segment
        GREG	@
m       OCTA    15
n       OCTA    10
space   BYTE    ' ',0
gcdstr  BYTE    "gcd: ",0
endl    BYTE    10,0

        LOC     #100
Main    LDO     $2,m
        LDO     $3,n

# Check if we have 2+ command line arguments (we use 2 only)
# If 2, and both are numbers, we need to parse them; else use defaults
        CMP     $4,$0,3
        PBN     $4,0F

        LDO     $5,$1,16
        PUSHJ   $4,std:strings:StringIsInt
        BZ      $4,0F
        LDO     $6,$1,8
        PUSHJ   $5,std:strings:StringIsInt
        BZ      $5,0F

        LDO     $4,$1,16
        PUSHJ   $3,std:strings:ParseNumber
        LDO     $6,$1,8
        PUSHJ   $5,std:strings:ParseNumber
        LDA     $2,$5

# Print the given 2 values
0H      LDA     $5,$2
        SET     $6,0
        PUSHJ   $4,std:io:PrintNumber
        LDA     $10,space
        PUSHJ   $9,std:io:PrintString
        LDA     $5,$3
        SET     $6,0
        PUSHJ   $4,std:io:PrintNumber
        LDA     $10,endl
        PUSHJ   $9,std:io:PrintString

# Calculate the GCD with Euclid's
        PUSHJ   $1,Euclid

# Print and exit
        LDA     $10,gcdstr
        PUSHJ   $9,std:io:PrintString
        SET     $2,0
        PUSHJ   $0,std:io:PrintNumber
        LDA     $10,endl
        PUSHJ   $9,std:io:PrintString
        JMP     std:sys:Exit          % Exit the application


# Euclid's Algorithm
Euclid  SWYM
        PREFIX  :EuclidGcd
m       IS      $0
n       IS      $1
t       GREG    0
r       GREG    0
1H      DIV     t,m,n
        GET     r,:rR
        LDA     m,n
        LDA     n,r
        PBNZ    n,1B

9H      SWYM
        POP     1,0

        PREFIX  :

