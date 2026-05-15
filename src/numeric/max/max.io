/*
    Gets and prints the maximum of a set of values
*/

// Method to calculate the max value
mymax := method(inlist,
    curr := 0
    inlist foreach(value,
        if(value > curr, curr := value)
    )
    curr
)

values := if(System args size > 1,
    System args slice(1) map(asNumber),
    list(22, 53, 64, 23, 45))

maxvalue := mymax(values)
(values .. "\nmax: " .. maxvalue) println
