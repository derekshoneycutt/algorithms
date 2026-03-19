        LOC	Data_Segment
	GREG	@
m       BYTE    15
n       BYTE    10
space   BYTE    ' ',0
gcdstr  BYTE    "gcd: ",0
endl    BYTE    10,0

	LOC     #100
Main    LDB     $2,m
        LDB     $3,n

# Check if we have 2+ command line arguments (we use 2 only)
# If 2, we need to parse them; else use defaults
        CMP     $4,$0,3
        PBN     $4,0F

        LDO     $4,$1,16
        PUSHJ   $3,Parse

        LDO     $5,$1,8
        PUSHJ   $4,Parse
        LDA     $2,$4

# Print the given 2 values
0H      LDA     $5,$2
        PUSHJ   $4,PrintN
        LDA     $255,space
	TRAP	0,Fputs,StdOut
        LDA     $5,$3
        PUSHJ   $4,PrintN
        LDA     $255,endl
	TRAP	0,Fputs,StdOut

# Calculate the GCD with Euclid's
        PUSHJ   $1,Euclid

# Print and exit
        LDA     $255,gcdstr
	TRAP	0,Fputs,StdOut
        PUSHJ   $0,PrintN
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
        GET     EucM,:rR

        PBZ     EucM,8F

        DIV     EucT,EucN,EucM
        GET     EucN,:rR

        PBZ     EucN,9F

        JMP     1B

8H      LDA     $0,EucN
9H      POP     1,0


# Print a number algorithm
PrintN  SWYM
output  IS      $255
PNval   IS      $0
next    IS      $1
curr    IS      $2
PNStack  GREG    2500
        SET     output,PNStack

0H      DIV     next,PNval,10
        GET     curr,:rR
        ADDU    curr,curr,'0'
        STBU    curr,output,0
        SUBU    output,output,1

        PBNP    next,9F

        LDA     PNval,next
        JMP     0B

9H      INCL    output,1
        TRAP    0,Fputs,StdOut
        POP     0,0


# Parse a number from a string
Parse   SWYM
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
        POP     1,0
