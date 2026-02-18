        LOC	Data_Segment
	GREG	@
m       BYTE    15
n       BYTE    10
space   BYTE    ' ',0
gcdstr  BYTE    "gcd: ",0
endl    BYTE    10,0
prntbf  BYTE    0,0,0,0,0,0,0,0,0,0,0

	LOC     #100
Main    LDB     $2,m
        LDB     $3,n

# Check if we have 2+ command line arguments (we use 2 only)
# If 2, we need to parse them; else use defaults
        CMP     $4,$0,2
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
1H      DIV     $2,$0,$1
        GET     $0,:rR

        PBZ     $0,8F

        DIV     $2,$1,$0
        GET     $1,:rR

        PBZ     $1,9F

        JMP     1B

8H      LDA     $0,$1
9H      POP     1,0


# Print a number algorithm
PrintN  LDA     $255,prntbf
        INCL    $255,10

0H      DIV     $1,$0,10
        GET     $2,:rR
        ADDU    $2,$2,'0'
        STBU    $2,$255,0
        SUBU    $255,$255,1

        PBNP    $1,9F

        LDA     $0,$1
        JMP     0B

9H      INCL    $255,1
        TRAP    0,Fputs,StdOut
        POP     0,0


# Parse a number from a string
Parse   SET     $1,0
        SET     $2,0

0H      LDB     $3,$0,$2

        PBZ     $3,9F

        MUL     $1,$1,10
        SUB     $3,$3,'0'
        ADDU    $1,$1,$3
        INCL    $2,1
        JMP     0B

9H      LDA     $0,$1
        POP     1,0
