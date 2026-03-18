
Integer extend [
    euclidGcd: anInteger [
        | m n |
        m := self.
        n := anInteger.
        [ n = 0 ] whileFalse: [
            | r |
            r := m \\ n.
            m := n.
            n := r 
        ].
        ^ m
    ]
]

| m n gcd argc argv |
m := 15.
n := 10.

argc := Smalltalk getArgc.
(argc > 1)
    ifTrue: [ 
        argv := Smalltalk arguments.
        m := (argv at: 1) asInteger.
        n := (argv at: 2) asInteger.
     ].

gcd := m euclidGcd: n.

stdout nextPutAll: (m asString, ' ', n asString); nl
stdout nextPutAll: ('gcd: ', gcd asString); nl
