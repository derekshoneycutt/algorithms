\ This application finds the maximum value among a set of numbers

\ Get the maximum of 2 values
: maxv ( a b -- maxval )
    2dup >
    if
        drop
    else
        nip
    then ;

\ Get the maximum of the next n values on the stack
: maxofn ( x1 .. xn n -- maxval )
    begin
        dup 1 >
    while
        1 - -rot
        maxv swap
    repeat
    drop ;

\ Put the command line arguments as numbers on the stack, then the number of argumetns
\   Defaults to 15 10 2
: stackargs ( -- x1 .. xn n )
    0 >r
    next-arg 2drop
    
    begin
        next-arg dup 0>
    while
        s>number? if
            d>s
            ."   " dup . cr
            r> 1+ >r
        else
            2drop
        then
    repeat
    2drop
    
    r> dup 0= if
        drop 15 10 2
        ."   " 15 . cr
        ."   " 10 . cr
    then ;

\ The main entry point we used to house the application
: good ( -- )
    ." values: " cr
    stackargs
    cr ." max: "
    maxofn . CR ;

good bye

