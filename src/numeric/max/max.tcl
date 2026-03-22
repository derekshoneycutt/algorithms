
proc max {values} {
    set current 0
    foreach value $values {
        if {$value > $current} {
            set current $value
        }
    }
    return $current
}


set values $argv
if {$argc < 1} {
    set values [list 15 10]
}
set max_value [max $values]

puts "values: $values\nmax: $max_value"
