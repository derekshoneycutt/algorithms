<?php
/*
 *  Calculate the GCD of two values and print it all to the screen
 */

/**
 * Calculate the GCD of $m and $n using Euclid's algorithm
 * 
 * @param m The first value to calculate the GCD for
 * @param n The second value to calculate the GCD for
 * @return Int The calculated GCD
 */
function euclidgcd($m, $n) {
    while ($n != 0) {
        $r = $m % $n;
        $m = $n;
        $n = $r;
    }
    return $m;
}

$m = 15;
$n = 10;

if ($argc >= 3) {
    $m = $argv[1];
    $n = $argv[2];
}

$gcd = euclidgcd($m, $n);

echo "$m $n\ngcd: $gcd\n";
?>
