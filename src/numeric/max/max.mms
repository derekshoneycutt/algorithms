        LOC	Data_Segment
        GREG	@
sp      GREG    #6000000000000000
n       GREG    0
d1      OCTA    15
d2      OCTA    10
valstr  BYTE    "values: ",10,0
maxstr  BYTE    "max: ",0
endl    BYTE    10,0
argc    IS      $0
argv    IS      $1
tempv   IS      $2
cret    IS      $3
cparm   IS      $4
maxn    IS      $5
prntr   IS      $9
output  IS      $10

        LOC     #100
Main    SUBU    argc,argc,1
        BZ      argc,dVals

# Parse all of the command line arguments to the stack
PArgs   MUL     tempv,argc,8
        ADDU    tempv,tempv,8
        ADDU    argv,argv,tempv

PArgsL  SUBU    argv,argv,8
        LDO     cparm,argv
        PUSHJ   cret,std:strings:StringIsInt
        BZ      cret,0F
        LDO     cparm,argv
        PUSHJ   cret,std:strings:ParseNumber
        STO     cret,sp,0
        SUBU    sp,sp,8
        ADDU    n,n,1
0H      SUBU    argc,argc,1
        PBNZ    argc,PArgsL

        JMP     PVals

# Add 2 default values to the stack
dVals   LDO     tempv,d1
        STO     tempv,sp,0
        SUBU    sp,sp,8
        ADDU    n,n,1
        LDO     tempv,d2
        STO     tempv,sp,0
        SUBU    sp,sp,8
        ADDU    n,n,1

# print the values on the stack
PVals   LDA     output,valstr
        PUSHJ   prntr,std:io:PrintString
        LDA     tempv,n
PValsL  ADDU    sp,sp,8
        LDO     cparm,sp,0
        SET     maxn,0
        PUSHJ   cret,std:io:PrintNumber
        LDA     output,endl
        PUSHJ   prntr,std:io:PrintString
        SUBU    tempv,tempv,1
        PBP     tempv,PValsL

    # reset the stack to the end of n values
        MUL     tempv,n,8
        SUBU    sp,sp,tempv

# Now do the max and print that
DoIt    LDA     cparm,n
        PUSHJ   cret,StackMax
        LDA     tempv,cret
        
        LDA     output,maxstr
        PUSHJ   prntr,std:io:PrintString
        LDA     cparm,tempv

        SET     maxn,0
        PUSHJ   cret,std:io:PrintNumber
        LDA     output,endl
        PUSHJ   prntr,std:io:PrintString
        JMP     std:sys:Exit          % Exit the application


# Find the maximum value in n values on the stack
StackMax  SWYM
        PREFIX  :StackMax
n       IS      $0
curr    IS      $1
test    IS      $2
sp      IS      :sp
temp    GREG    0
        SET     curr,0
Loop    ADDU    sp,sp,8
        LDO     test,sp,0
        CMP     temp,test,curr
        PBNP    temp,Dec

        LDA     curr,test

Dec     SUBU    n,n,1
        PBP     n,Loop

        LDA     $0,curr
        POP     1,0

        PREFIX  :
