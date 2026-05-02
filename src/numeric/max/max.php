<?php
/*
 *  This program takes a list of values and outputs the maximum value of those
 */

/**
 * Finds the maximum value in a list of numbers.
 * 
 * @param list The list of numbers to find the maximum value from.
 * @return int The maximum value in the list.

 */
function max_list($list) {
    $current = 0;
    foreach ($list as $value) {
        if ($value > $current) {
            $current = $value;
        }
    }
    return $current;
}

$list = [15, 10];
if ($argc > 1) {
    array_shift($argv);
    $list = $argv;
}

$maxValue = max_list($list);

echo "values: ";
print_r($list);
echo "max: $maxValue\n";
?>