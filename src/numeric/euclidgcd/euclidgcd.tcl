
proc euclidgcd {m n} {
    while {$n != 0} {
        set r [expr {$m % $n}]
        set m $n
        set n $r
    }
    return $m
}

set m 15
set n 10
if {$argc > 1} {
    set m_maybe [lindex $argv 0]
    set n_maybe [lindex $argv 1]
    if {[string is integer -strict $m_maybe]
        && [string is integer -strict $n_maybe]} {
        set m [expr {int($m_maybe)}]
        set n [expr {int($n_maybe)}]
    }
}

set gcd [euclidgcd $m $n]

puts "$m $n\ngcd: $gcd\n"
