
Object subclass: PrimeSieve [
    | current cache count maxCount |

    <comment:
        'Gets a list of primes via state machine form of Eratosthanes Sieve'>

    init: anInteger [
        <category: 'initialization'>
        count := 0.
        maxCount := anInteger.
        cache := Array new: maxCount.
    ]

    next [
        <category: 'iteration'>
        | candidate isPrime testCache |
        (count < 2)
            ifTrue: [
                count := count + 1.
                candidate := count + 1.
                cache at: count put: candidate.
            ]
            ifFalse: [
                (count >= maxCount)
                    ifTrue: [
                        candidate := 0.
                    ]
                    ifFalse: [
                        candidate := current.
                        isPrime := false.

                        [ isPrime ]
                            whileFalse: [
                                candidate := candidate + 2.

                                testCache := cache copyFrom: 1 to: count.
                                (testCache allSatisfy: [:each | (candidate \\ each) ~= 0])
                                    ifTrue: [
                                        isPrime := true.
                                        count := count + 1.
                                        cache at: count put: candidate.
                                    ].
                            ].
                    ].
            ].
        current := candidate.
        ^ candidate
    ]

    getPrimes [
        <categtory: 'simple'>
        [(self next) > 0] whileTrue: [].
        ^ cache
    ]
]

Integer extend [
    padFourZeros [
        | s s2 |
        s := self asString.
        s2 := (String new: (4 - s size) withAll: $0), s.
        ^ s2
    ]
]

Array extend [
    printPrimes [
        | primes strs1 strs2 strs3 strs4 strs5 strs6 strs7 strs8 strs9 strs10 |
        primes := self.
        strs1 := (primes copyFrom: 1 to: 50) collect: [:prime | prime padFourZeros].
        strs2 := (primes copyFrom: 51 to: 100) collect: [:prime | prime padFourZeros].
        strs3 := (primes copyFrom: 101 to: 150) collect: [:prime | prime padFourZeros].
        strs4 := (primes copyFrom: 151 to: 200) collect: [:prime | prime padFourZeros].
        strs5 := (primes copyFrom: 201 to: 250) collect: [:prime | prime padFourZeros].
        strs6 := (primes copyFrom: 251 to: 300) collect: [:prime | prime padFourZeros].
        strs7 := (primes copyFrom: 301 to: 350) collect: [:prime | prime padFourZeros].
        strs8 := (primes copyFrom: 351 to: 400) collect: [:prime | prime padFourZeros].
        strs9 := (primes copyFrom: 401 to: 450) collect: [:prime | prime padFourZeros].
        strs10 := (primes copyFrom: 451 to: 500) collect: [:prime | prime padFourZeros].

        stdout nextPutAll: 'First Five Hundred Primes'; nl.
        (1 to: 50) do: [:index |
            stdout nextPutAll: ('     ', (strs1 at: index), ' ',
                (strs2 at: index), ' ', (strs3 at: index), ' ',
                (strs4 at: index), ' ', (strs5 at: index), ' ',
                (strs6 at: index), ' ', (strs7 at: index), ' ',
                (strs8 at: index), ' ', (strs9 at: index), ' ',
                (strs10 at: index)); nl.
        ]
    ]
]

| primes sieve |

sieve := PrimeSieve new.
sieve init: 500.
primes := sieve getPrimes.
primes printPrimes.
