# This program gets the maximum value of a sequence of values

# Finds the maximum value in a list of numbers.
# 
# Parameters
# ----------
# list
#     The list to find the maximum value from
#
# Returns
# ---------
#     The maximum value of the list
proc mymax {values} {
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
set max_value [mymax $values]

puts "values: $values\nmax: $max_value"
