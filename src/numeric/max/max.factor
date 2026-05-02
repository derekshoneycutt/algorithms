! This program gets the maximum of a sequence of values
USING: arrays command-line formatting io kernel math math.parser namespaces prettyprint sequences ;
IN: mymax

! Maximum of 2 values
: mymax ( a b -- maxval )
    2dup >
    [ drop ]
    [ nip ]
    if ;

! Maximum of a sequence on the stack
: maxof ( seq -- maxval )
    dup rest swap first
    [ mymax ] reduce ;

! Get the command line arguments as a sequence on the stack
: args>ints ( -- seq )
    command-line get
    [ string>number ] map
    sift ;

! Print the values and the max
: main-method ( -- )
    "values:\n" printf
    args>ints
    dup empty? [ drop 15 10 2array ] when
    dup [ "   %d\n" printf ] each
    maxof
    "max: %d\n" printf ;

MAIN: main-method
