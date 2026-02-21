        LOC	Data_Segment
        GREG	@
sp      GREG    0
n       GREG    0
d1      OCTA    15
d2      OCTA    10
valstr  BYTE    "values: ",10,0
maxstr  BYTE    "max: ",0
endl    BYTE    10,0
argc    IS      $0
argv    IS      $1
tempv   IS      $2
cparm   IS      $4
cret    IS      $3
output  IS      $255

        LOC     #100
Main    SUBU    argc,argc,1
        BZ      argc,dVals

# Parse all of the command line arguments to the stack
PArgs   MUL     tempv,argc,8
        ADDU    tempv,tempv,8
        ADDU    argv,argv,tempv

PArgsL  SUBU    argv,argv,8
        LDO     cparm,argv
        PUSHJ   cret,Parse
        STO     cret,sp,0
        ADDU    sp,sp,8
        ADDU    n,n,1
        SUBU    argc,argc,1
        PBNZ    argc,PArgsL

        JMP     PVals

# Add 2 default values to the stack
dVals   LDO     tempv,d1
        STO     tempv,sp,0
        ADDU    sp,sp,8
        ADDU    n,n,1
        LDO     tempv,d2
        STO     tempv,sp,0
        ADDU    sp,sp,8
        ADDU    n,n,1

# print the values on the stack
PVals   LDA     output,valstr
        TRAP    0,Fputs,StdOut
        LDA     tempv,n
PValsL  SUBU    sp,sp,8
        LDO     cparm,sp,0
        PUSHJ   cret,PrintN
        LDA     output,endl
        TRAP    0,Fputs,StdOut
        SUBU    tempv,tempv,1
        PBP     tempv,PValsL

    # reset the stack to the end of n values
        MUL     tempv,n,8
        ADDU    sp,sp,tempv

# Now do the max and print that
DoIt    LDA     cparm,n
        PUSHJ   cret,StackMax
        LDA     tempv,cret
        
        LDA     output,maxstr
        TRAP    0,Fputs,StdOut
        LDA     cparm,tempv
        PUSHJ   cret,PrintN
        LDA     output,endl
        TRAP    0,Fputs,StdOut
        TRAP    0,Halt,0


# Find the maximum value in n values on the stack
StackMax  SWYM
stackn  IS      $0
curr    IS      $1
test    IS      $2
temp    IS      $3
        SET     curr,0
SMLoop  SUBU    sp,sp,8
        LDO     test,sp,0
        CMP     temp,test,curr
        PBNP    temp,SMDec

        LDA     curr,test

SMDec   SUBU    stackn,stackn,1
        PBP     stackn,SMLoop

        LDA     $0,curr
        POP     1,0

# Print a number algorithm
PrintN  SWYM
PNval   IS      $0
next    IS      $1
currd   IS      $2
PNStack  GREG    2500
        SET     output,PNStack

0H      DIV     next,PNval,10
        GET     currd,:rR
        ADDU    currd,currd,'0'
        STBU    currd,output,0
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
