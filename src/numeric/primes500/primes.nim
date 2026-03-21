import std/sequtils
import std/strutils
import std/strformat

iterator primeSieve(): int =
    yield 2
    var cache = newSeq[int]()
    var candidate = 3
    while true:
        if all(cache, proc (prime: int): bool = candidate mod prime != 0):
            yield candidate
            cache.add(candidate)
        candidate += 2

proc getPrimes(n: int): seq[int] =
    var primes = newSeq[int]()
    var count = 0
    for prime in primeSieve():
        primes.add(prime)
        count += 1
        if count >= n:
            break
    return primes

proc printPrimes(primes: seq[int]) =
    echo "First Five Hundred Primes"
    for index in 0..49:
        echo &"     {primes[index]:04} {primes[index + 50]:04}" &
             &" {primes[index + 100]:04} {primes[index + 150]:04}" &
             &" {primes[index + 200]:04} {primes[index + 250]:04}" &
             &" {primes[index + 300]:04} {primes[index + 350]:04}" &
             &" {primes[index + 400]:04} {primes[index + 450]:04}"

printPrimes(getPrimes(500))
