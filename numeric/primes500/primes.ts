
function* prime_sieve() : Generator<number, void, any> {
    yield 2;
    let cache = [2];
    var candidate = 3;
    while (true) {
        if (cache.every((prime) => candidate % prime != 0)) {
            yield candidate;
            cache.push(candidate);
        }

        candidate += 2;
    }
}

function get_primes(count: number): Array<number> {
    let primes = [];
    for (const prime of prime_sieve()) {
        primes.push(prime);
        if (primes.length >= count) {
            break;
        }
    }
    return primes;
}

function print_primes(primes: Array<number>) {
    console.log("First Five Hundred Primes");
    var pad = (n: number) => n.toString().padStart(4, '0');
    for (var n = 0; n < 50; ++n) {
        console.log(`     ${pad(primes[n])} ${pad(primes[n + 50])}`
            + ` ${pad(primes[n + 100])} ${pad(primes[n + 150])}`
            + ` ${pad(primes[n + 200])} ${pad(primes[n + 250])}`
            + ` ${pad(primes[n + 300])} ${pad(primes[n + 350])}`
            + ` ${pad(primes[n + 400])} ${pad(primes[n + 450])}`);
    }
}

print_primes(get_primes(500));
