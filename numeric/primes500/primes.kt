
fun PrimeSieve() = sequence {
    yield(2)
    var cache = mutableListOf(2)
    var candidate = 3
    while (true) {
        if (cache.all { candidate % it != 0 }) {
            yield(candidate)
            cache.add(candidate)
        }

        candidate += 2
    }
}

fun GetPrimes(count: Int): List<Int> {
    return PrimeSieve().take(count).toList()
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
    PrintPrimes(GetPrimes(500))
}
