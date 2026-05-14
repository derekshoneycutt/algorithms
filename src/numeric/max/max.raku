=for comment
    This program takes a list of values and outputs the maximum value of those
=cut comment

use strict;

# Find the max from the given list
sub mymax(@list) {
    my $current = @list[0];
    for @list -> $value {
        if $value > $current {
            $current = $value;
        }
    }
    return $current;
}

# The main entry point to the application
sub MAIN(*@args where { $_.all ~~ /^\d+$/ }) {
    my Int @ints = @args>>.Int;
    if @ints.elems < 1 {
        @ints = 15, 10;
    }

    my $maxValue = mymax(@ints);
    print "values: ", @ints, "\nmax: ", $maxValue, "\n";
}
