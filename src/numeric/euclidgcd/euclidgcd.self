"
    Calculate the GCD of two values and print it all to the screen
"
_PrintScriptName: false.

traits integer _AddSlots: (|
    " Calculate the GCD with Euclid's algorithm "
    euclidGcd: nIn = (
        | m. n. r. |
        m: self.
        n: nIn.
        [ n != 0 ] whileTrue: [
            r: m % n.
            m: n.
            n: r.
        ].
        m
    ).
|).

[|
    argv. argc.
    m. n. gcdValue.
|
    m: 15.
    n: 10.
" Attempt to use the command line arguments if they are available "
    argv: _CommandLine.
    argc: argv size.
    (argc >= 8) ifTrue: [
        m: (argv at: (argc - 2)) asInteger.
        n: (argv at: (argc - 1)) asInteger.
    ].

    gcdValue: (m euclidGcd: n).
    stdout write: (m asString, ' ', n asString, '\ngcd: ', gcdValue asString, '\n').
] value.

" Send put message to stdout"
_Quit.
