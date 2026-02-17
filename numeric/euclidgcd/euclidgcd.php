<?php
function euclidgcd($m, $n) {
    $r = $m % $n;
    while ($r != 0) {
        $m = $n;
        $n = $r;
        $r = $m % $n;
    }
    return $n;
}

$v_1 = 15;
$v_2 = 10;

if ($argc >= 3) {
    $v_1 = $argv[1];
    $v_2 = $argv[2];
}

echo "$v_1 $v_2\n";
$gcd = euclidgcd($v_1, $v_2);
echo "$gcd\n";
?>