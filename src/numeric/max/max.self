"
    Finds the maximum of multiple values and prints it to the screen
"
_PrintScriptName: false.

traits list _AddSlots: (|
    " Find the maximum value from the list "
    max = (
        | curr. |
        curr: 0.
        self do: [|:each| 
            (each > curr) ifTrue: [
                curr: each.
            ].
        ].
        curr
    ).
|).

[|
    argv. argc.
    values. parsed. maxValue. valuesText.
|
    argv: _CommandLine.
    argc: argv size.
    values: list copyRemoveAll.

    " Attempt to use the command line arguments if they are available, or use 15, 10 "
    argv do: [|:arg|
        parsed: arg asIntegerIfFail: [nil].
        parsed != nil ifTrue: [
            values addLast: parsed.
        ].
    ].
    values isEmpty ifTrue: [
        values addLast: 15.
        values addLast: 10.
    ].

    maxValue: values max.

    stdout write: ('values: ', values statePrintString, '\nmax: ', maxValue asString, '\n').
] value.

_Quit.
