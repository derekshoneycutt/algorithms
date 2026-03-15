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
# If 2, we need to parse them; else use defaults
        CMP     $4,$0,3
        PBN     $4,0F

        LDO     $4,$1,16
        PUSHJ   $3,ParseNumber

        LDO     $5,$1,8
        PUSHJ   $4,ParseNumber
        LDA     $2,$4

# Print the given 2 values
0H      LDA     $5,$2
        SET     $6,0
        PUSHJ   $4,PrintNumber
        LDA     $255,space
        TRAP	0,Fputs,StdOut
        LDA     $5,$3
        SET     $6,0
        PUSHJ   $4,PrintNumber
        LDA     $255,endl
        TRAP	0,Fputs,StdOut

# Calculate the GCD with Euclid's
        PUSHJ   $1,Euclid

# Print and exit
        LDA     $255,gcdstr
        TRAP	0,Fputs,StdOut
        SET     $2,0
        PUSHJ   $0,PrintNumber
        LDA     $255,endl
        TRAP	0,Fputs,StdOut
        TRAP	0,Halt,0


# Euclid's Algorithm
Euclid  SWYM
EucM    IS      $0
EucN    IS      $1
EucT    IS      $2
EucR    IS      $3
1H      DIV     EucT,EucM,EucN
        GET     EucR,:rR
        LDA     EucM,EucN
        LDA     EucN,EucR
        PBNZ    EucN,1B

9H      POP     1,0

