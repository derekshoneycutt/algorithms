
function get_primes(): Array<number> {
    let primes = [2];
    var n = 3;

    for (var j = 1; j < 500; ++j) {
        primes.push(n);

        var is_prime = false;
        while (!is_prime) {
            n += 2;

            var q = 9999;
            var r = 1;
            var t = 0;
            for (var k = 1; (r != 0) && (q > t); ++k) {
                t = primes[k];
                q = n / t;
                r = n % t;
            }

            is_prime = (r != 0) && (q <= t);
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

print_primes(get_primes());
