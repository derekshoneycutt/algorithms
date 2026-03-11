sdate   IS      1950
edate   IS      2050
output  IS      $255
t       GREG    0
coin    GREG    0       # coroutine in current address
coout   GREG    0       # coroutine out current address

        LOC     #100
Main    GETA    coin,CoIn
        PUSHJ   $0,CoOut
        TRAP    0,Halt,0

# Coroutine coin : Loops over the range of years,
#       returning date of easter on each to coout.
#       $0 is set to -1 if at the end of the date loop.
CoIn    SWYM
curry   GREG    sdate
0H      SET     t,edate
        CMPU    t,curry,t
        BP      t,9F

        LDA     $1,curry
        PUSHJ   $0,GetEaster
        LDA     $3,curry
        GO      coin,coout,0
        INCL    curry,1
        JMP     0B

9H      NEG     $0,0,1
        GO      coin,coout,0

# Coroutine coout :
#    Loops through LoopEasters and prints the easter dates
CoOut   SWYM
nestrJ  GREG    0
        GET     nestrJ,:rJ
        GREG    @
header  BYTE    "Easters:",10,0
        LDA     $255,header
        TRAP    0,Fputs,StdOut

0H      GO      coout,coin,0
        BN      $0,9F
        PUSHJ   $0,PrintDate
        JMP     0B

9H      PUT     rJ,nestrJ
        POP     0,0

# Calculate the day of Easter for the year in Y
GetEaster  SWYM
Y       IS      $0
day     IS      $0
month   IS      $1
G       GREG    0
C       GREG    0
X       GREG    0
Z       GREG    0
D       GREG    0
E       GREG    0
N       GREG    0

1H      PUT     rD,0
        DIVU    t,Y,19
        GET     G,:rR
        ADDU    G,G,1

2H      PUT     rD,0
        DIVU    C,Y,100
        ADDU    C,C,1

3H      MULU    X,C,3
        PUT     rD,0
        DIVU    X,X,4
        SUBU    X,X,12

        MULU    Z,C,8
        ADDU    Z,Z,5
        PUT     rD,0
        DIVU    Z,Z,25
        SUBU    Z,Z,5

4H      MULU    D,Y,5
        PUT     rD,0
        DIVU    D,D,4
        SUBU    D,D,X
        SUBU    D,D,10

5H      MULU    E,G,11
        ADDU    E,E,20
        ADDU    E,E,Z
        SUBU    E,E,X
        PUT     rD,0
        DIVU    t,E,30
        GET     E,:rR

        CMPU    t,E,25
        PBNZ    t,5F
        CMPU    t,G,11
        PBNP    t,5F
        JMP     INC5

5H      CMPU    t,E,24
        PBNZ    t,6F

INC5    ADDU    E,E,1

6H      SET     t,44
        SUBU    N,t,E

        CMPU    t,N,21
        PBNN    t,7F

        ADDU    N,N,30

7H      ADDU    t,D,N
        PUT     rD,0
        DIVU    t,t,7
        GET     t,:rR
        ADDU    N,N,7
        SUBU    N,N,t

8H      CMPU    t,N,31
        BP      t,8F
        SET     month,0
        JMP     9F

8H      SUBU    N,N,31
        SET     month,1

9H      LDA     day,N
        POP     3,0


# Print a date as dd MMMM, yyyy
PrintDate  SWYM
dd      IS      $0
MMMM    IS      $1
yyyy    IS      $2
t2      IS      $3

PDStack  GREG   25000

        GREG    @
indent  BYTE    "   ",0

        LDA     output,indent
        TRAP    0,Fputs,StdOut

        SET     output,PDStack
        PUT     rD,0
        DIV     t,dd,10
        ADDU    t,t,'0'
        STBU    t,output,0
        GET     t,:rR
        ADDU    t,t,'0'
        STBU    t,output,1
        SET     t,0
        STBU    t,output,2
        TRAP    0,Fputs,StdOut

0H      BP      MMMM,0F
        GREG    @
fubar   BYTE    " March ",0
        LDA     $255,fubar
        TRAP    0,Fputs,StdOut
        JMP     1F

0H      SWYM
        GREG    @
barfu   BYTE    " April ",0
        LDA     $255,barfu
        TRAP    0,Fputs,StdOut

1H      SET     output,PDStack
        PUT     rD,0
        SET     t2,1000
        DIV     t,yyyy,t2
        ADDU    t,t,'0'
        STBU    t,output,0
        GET     t,:rR
        PUT     rD,0
        DIV     t,t,100
        ADDU    t,t,'0'
        STBU    t,output,1
        GET     t,:rR
        PUT     rD,0
        DIV     t,t,10
        ADDU    t,t,'0'
        STBU    t,output,2
        GET     t,:rR
        ADDU    t,t,'0'
        STBU    t,output,3
        SET     t,0
        STBU    t,output,4
        TRAP    0,Fputs,StdOut

1H      GREG    @
endl    BYTE    10,0
        LDA     output,endl
        TRAP    0,Fputs,StdOut
        POP     0,0

