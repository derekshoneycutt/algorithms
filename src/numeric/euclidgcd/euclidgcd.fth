\ This application calculates gcd with Euclid's algorithm, forthy style

\ Calculate GCD ; we do this mostly via stack manipulation in a loop in Forth!
: euclidgcd ( m n -- gcd )
    begin
        dup 0<>
    while
        tuck
        mod
    repeat
    drop ;

\ Get the first 2 command line arguments as numbers, if possible
: get-args ( -- m n )
    argc @ 4 >= if
        next-arg 2drop
        next-arg s>number? if
            d>s
        else
            2DROP 15
        then
        next-arg s>number? if
            d>s
        else
            2DROP 10
        then
    else
        15 10
    then ;

\ The main entry point we used to house the application
: main ( -- )
    get-args
    2dup
    swap . ."  " . CR ." gcd: "
    euclidgcd . CR ;

main bye
