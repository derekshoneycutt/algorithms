<?php
function prime_sieve() {
    yield 2;
    $cache = [2];
    $candidate = 3;
    while (true) {
        if (array_all($cache, function ($prime) use ($candidate) {
            return $candidate % $prime != 0; })) {
            yield $candidate;
            $cache[] = $candidate;
        }

        $candidate += 2;
    }
}

function get_primes($count) {
    $primes = [];
    $n = 0;
    foreach (prime_sieve() as $prime) {
        $primes[] = $prime;
        $n++;
        if ($n >= $count) {
            break;
        }
    }
    return $primes;
}

function print_primes($primes) {
    echo "First Five Hundred Primes\n";
    for ($i = 0; $i < 50; ++$i) {
        echo sprintf("     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d\n",
            $primes[$i], $primes[$i + 50], $primes[$i + 100], $primes[$i + 150],
            $primes[$i + 200], $primes[$i + 250], $primes[$i + 300],
            $primes[$i + 350], $primes[$i + 400], $primes[$i + 450]);
    }
}

print_primes(get_primes(500));
?>