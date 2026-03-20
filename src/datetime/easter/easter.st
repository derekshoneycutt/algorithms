
Object subclass: EasterDate [
    | day month year |

    <comment: 'Contains a date structure to print'>

    initDay: d andMonth: m andYear: y [
        day := d.
        month := m.
        year := y.
    ]

    print [
        <category: 'display'>
        stdout nextPutAll: ('   ', (day padZeros: 2),
            ' ', month, ', ', (year padZeros: 4)); nl.
    ]
]

Integer extend [
    padZeros: n [
        | s s2 |
        s := self asString.
        s2 := (String new: (n - s size) withAll: $0), s.
        ^ s2
    ]

    getEaster [
        | g c x z d e n day month year easter |
        year := self.
        g := (year \\ 19) + 1.
        c := (year // 100) + 1.
        x := ((3 * c) // 4) - 12.
        z := (((8 * c) + 5) // 25) - 5.
        d := ((5 * year) // 4) - x - 10.
        e := ((11 * g) + 20 + z - x) \\ 30.
        (((e = 25) & (g > 11)) | (e = 24)) ifTrue: [
            e := e + 1.
        ].
        n := 44 - e.
        (n < 21) ifTrue: [
            n := n + 30.
        ].
        n := n + 7 - ((d + n) \\ 7).

        (n > 31) ifTrue: [
            day := n - 31.
            month := 'April'.
        ] ifFalse: [
            day := n.
            month := 'March'.
        ].
        easter := EasterDate new.
        easter initDay: day andMonth: month andYear: year.
        ^ easter
    ]
]

stdout nextPutAll: 'Easters:'; nl.
(1950 to: 2050) do: [:year | (year getEaster) print]
