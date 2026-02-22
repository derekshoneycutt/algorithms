<?php
function get_primes() {
    $primes = [2];
    $n = 3;

    for ($j = 1; $j < 500; ++$j) {
        $primes[] = $n;

        $is_prime = false;
        while (!$is_prime) {
            $n += 2;

            $q = 9999;
            $r = 1;
            $t = 0;
            for ($k = 1; ($r != 0) && ($q > $t); ++$k) {
                $t = $primes[$k];
                $q = $n / $t;
                $r = $n % $t;
            }

            $is_prime = ($r != 0) && ($q <= $t);
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

print_primes(get_primes());
?>