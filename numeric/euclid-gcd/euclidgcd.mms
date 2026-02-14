        LOC	Data_Segment
	GREG	@
m       BYTE    15
n       BYTE    10
space   BYTE    " ",0
endl    BYTE    10,0
prntbf  BYTE    0,0,0,0,0,0,0,0,0,0,0

	LOC     #100
Main    SWYM
# Check if we have 2+ command line arguments (we use 2 only)
# If 2, we need to parse them; else use defaults
        CMP     $3,$0,2
        PBN     $3,PDef

        LDO     $5,$1,8
        LDO     $3,$1,16
        PUSHJ   $4,Parse
        LDA     $1,$4
        LDA     $5,$3
        PUSHJ   $4,Parse
        LDA     $2,$4

        JMP     PInpt

PDef    LDB     $1,m
        LDB     $2,n

# Print the given 2 values
PInpt   LDA     $4,$1
        PUSHJ   $3,PrintN
        LDA     $255,space
	TRAP	0,Fputs,StdOut
        LDA     $4,$2
        PUSHJ   $3,PrintN
        LDA     $255,endl
	TRAP	0,Fputs,StdOut

# Calculate the GCD with Euclid's
Calc    PUSHJ   $0,Euclid
        LDA     $1,$0

# Print and exit
POutpt  PUSHJ   $0,PrintN
        LDA     $255,endl
	TRAP	0,Fputs,StdOut
        TRAP	0,Halt,0


# Euclid's Algorithm
Euclid  SWYM
Step1   DIV     $2,$0,$1
        GET     $3,:rR

Step2   PBZ     $3,EucldE

Step3   LDA     $0,$1
        LDA     $1,$3
        JMP     Step1

EucldE  LDA     $0,$1
        POP     1,0


# Print a number algorithm
PrintN  LDA     $255,prntbf
        INCL    $255,10

PrntDv  DIV     $1,$0,10
        GET     $2,:rR
        ADDU    $2,$2,'0'
        STBU    $2,$255,0
        SUBU    $255,$255,1

        PBP     $1,PrntMr

        INCL    $255,1
        TRAP    0,Fputs,StdOut
        POP     0,0

PrntMr  LDA     $0,$1
        JMP     PrntDv


# Parse a number from a string
Parse   SET     $1,0
        SET     $2,0
PrseC   LDB     $3,$0,$2
        PBNZ    $3,PrseN
        LDA     $0,$1
        POP     1,0

PrseN   MUL     $1,$1,10
        SUB     $3,$3,'0'
        ADDU    $1,$1,$3
        INCL    $2,1
        JMP     PrseC


