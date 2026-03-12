<?php
function get_easter_for($year) {
    $g = ($year % 19) + 1;
    $c = intdiv($year, 100) + 1;
    $x = intdiv(3 * $c, 4) - 12;
    $z = intdiv(((8 * $c) + 5), 25) - 5;
    $d = intdiv(5 * $year, 4) - $x - 10;
    $e = ((11 * $g) + 20 + $z - $x) % 30;
    if ((($e == 25) && ($g > 11)) || ($e == 24)) {
        ++$e;
    }
    $n = 44 - $e;
    if ($n < 21) {
        $n += 30;
    }
    $n += 7 - (($d + $n) % 7);

    if ($n > 31) {
        return date("   d F, Y", mktime(0, 0, 0, 4, $n - 31, $year));
    }
    return date("   d F, Y", mktime(0, 0, 0, 3, $n, $year));
}

function get_easters($start, $end) {
    for ($year = $start; $year <= $end; ++$year) {
        yield get_easter_for($year);
    }
}

function print_easters($easters) {
    echo "Easters:\n";
    foreach ($easters as $easter) {
        echo $easter;
        echo "\n";
    }
}

print_easters(get_easters(1950, 2050));
?>