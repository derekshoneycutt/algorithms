! This program calculates the greatest common denominator between 2 values
USING: command-line formatting io kernel math math.parser namespaces prettyprint sequences ;
IN: gcd

! Factor gets pretty functional style with the gcd calc
: euclidgcd ( m n -- gcd )
    dup zero?
    [ drop ]
    [ [ mod ] keep swap euclidgcd ]
    if ;

! We need to get the first 2 command line arguments if they're available; or 15 and 10
: get-args ( -- m n )
    command-line get
    dup length 2 >= [
        [ 0 swap nth string>number ]
        [ 1 swap nth string>number ] bi
    ] [
        drop
        15 10
    ] if ;

! The main method gets the args, calculates the gcd, and prints to the screen
: main-method ( -- )
    get-args
    2dup
    "%d %d\ngcd: " printf
    euclidgcd . ;

MAIN: main-method
