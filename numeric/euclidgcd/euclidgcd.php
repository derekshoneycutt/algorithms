<?php
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
