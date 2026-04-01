#[
    Calculates the GCD of two values and prints it all to the screen
]#
import os
import std/strutils
import std/strformat

# Calculates the GCD of two values using Euclid's algorithm
proc euclidgcd(m_in: int, n_in: int): int =
    var
        r = 0
        m = m_in
        n = n_in
    while n != 0:
        r = m mod n
        m = n
        n = r
    return m

var
    m = 15
    n = 10

# parse the first 2 parameters, or just use the default
if paramCount() > 1:
    m = parseInt(paramStr(1))
    n = parseInt(paramStr(2))

let gcd = euclidgcd(m, n)

echo &"{m} {n}"
echo &"gcd: {gcd}"
