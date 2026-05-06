/*
    Calculates the GCD for 2 given values
*/

// Method used to calculate the GCD value
euclidgcd := method(m, n,
    r := 0
    while(n != 0,
        r := m % n
        m := n
        n := r
    )
    m
)

# Use default 15, 10; pull from command line arguments when possible
m := if(System args size > 1, System args at(1) asNumber, 15)
n := if(System args size > 2, System args at(2) asNumber, 10)
gcd := euclidgcd(m, n)

(m .. " " .. n .. "\ngcd: " .. gcd) println
