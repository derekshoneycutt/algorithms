L       IS      500
t       IS      $255
n       GREG    0
q       GREG    0
r       GREG    0
jj      GREG    0
kk      GREG    0
pk      GREG    0
mm      IS      kk

        LOC	Data_Segment
PRIME1  WYDE    2
        LOC     PRIME1+2*L
ptop    GREG	@
j0      GREG    PRIME1+2-@

# First entry immediately calculates 500 primes
        LOC     #100
Main    SET     n,3
        SET     jj,j0

2H      STWU    n,ptop,jj
        INCL    jj,2

3H      BZ      jj,2F

4H      INCL    n,2

5H      SET     kk,j0

6H      LDWU    pk,ptop,kk
        DIV     q,n,pk
        GET     r,rR
        BZ      r,4B

7H      CMP     t,q,pk
        BNP     t,2B

8H      INCL    kk,2
        JMP     6B

# Second part, we print the table
        GREG    @
header  BYTE    "First Five Hundred Primes",10,0
endl    BYTE    10,0
indent  BYTE    "   ",0

    # header
2H      LDA     $1,header
        PUSHJ   0,std:io:PrintString
        NEG     mm,2

    # Print a line of numbers
3H      ADD     mm,mm,j0
        LDA     $1,indent
        PUSHJ   0,std:io:PrintString

    # Print a number
2H      LDWU    pk,ptop,mm
spacing BYTE    " ",0
        LDA     $1,spacing
        PUSHJ   0,std:io:PrintString

        LDA     $1,pk
        SET     $2,4
        SET     $3,'0'
        PUSHJ   $0,std:io:PrintNumber

    # advance to next number in line?
        INCL    mm,2*L/10
        PBN     mm,2B

    # Go to the next line; or end
        LDA     $1,endl
        PUSHJ   0,std:io:PrintString

        CMP     t,mm,2*(L/10-1)
        PBNZ    t,3B

        JMP     std:sys:Exit          % Exit the application
