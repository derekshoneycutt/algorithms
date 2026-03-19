
Array extend [
    max [
        | current |
        current := 0.
        self do: [:each | 
            (each > current)
                ifTrue: [ current := each ]
        ].
        ^ current
    ]
]

| values argc max |
argc := Smalltalk getArgc.

(argc > 0)
    ifTrue: [
        | argv i |
        argv := Smalltalk arguments.
        values := Array new: argc.
        i := 1.
        [ i > argc ] whileFalse: [
            values at: i put: (argv at: i) asInteger.
            i := i + 1
        ]
    ]
    ifFalse: [
        values := #(15 10)
    ].

max := values max.

stdout nextPutAll: 'values: '.
values printNl.
stdout nextPutAll: ('max: ', max asString); nl
