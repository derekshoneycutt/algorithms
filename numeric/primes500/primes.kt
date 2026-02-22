
fun GetPrimes(): List<Int> {
    var primes = MutableList(500) {0}
    primes[0] = 2
    var n = 3

    for (j in 1..499) {
        primes[j] = n

        var is_prime = false
        while (!is_prime) {
            n += 2

            var q = 9999
            var r = 1
            var t = 0
            var k = 1
            while ((r != 0) && (q > t)) {
                t = primes[k]
                q = n / t
                r = n % t
                ++k
            }

            is_prime = (r != 0) && (q <= t)
        }
    }
    return primes
}

fun PrintPrimes(primes: List<Int>) {
    println("First Five Hundred Primes")
    for (i in 0..49) {
        print("     ${primes[i].toString().padStart(4, '0')} "
        + "${primes[50 + i].toString().padStart(4, '0')} "
        + "${primes[100 + i].toString().padStart(4, '0')} "
        + "${primes[150 + i].toString().padStart(4, '0')} "
        + "${primes[200 + i].toString().padStart(4, '0')} "
        + "${primes[250 + i].toString().padStart(4, '0')} "
        + "${primes[300 + i].toString().padStart(4, '0')} "
        + "${primes[350 + i].toString().padStart(4, '0')} "
        + "${primes[400 + i].toString().padStart(4, '0')} "
        + "${primes[450 + i].toString().padStart(4, '0')}\n")
    }
}

fun main(args: Array<String>) {
    PrintPrimes(GetPrimes())
}
