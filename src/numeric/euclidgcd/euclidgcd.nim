import os
import std/strutils
import std/strformat

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

if paramCount() > 1:
    m = parseInt(paramStr(1))
    n = parseInt(paramStr(2))

let gcd = euclidgcd(m, n)

echo &"{m} {n}"
echo &"gcd: {gcd}"
