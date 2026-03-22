
proc max {values} {
    set current 0
    foreach value $values {
        if {[string is integer -strict $value]} {
            if {$value > $current} {
                set current [expr {int($value)}]
            }
        }
    }
    return $current
}


set values $argv
if {$argc < 1} {
    set values {15 10}
}
set max_value [max $values]

puts "values: $values\nmax: $max_value"
