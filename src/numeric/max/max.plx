=for comment
    This program takes a list of values and outputs the maximum value of those
=cut comment

use strict;
use warnings;

# Find the max from the given list
sub max {
    my @list = @_;
    my $current = 0;
    foreach my $value (@list) {
        if ($value > $current) {
            $current = $value;
        }
    }
    return $current;
}

my @list = @ARGV;
if (@ARGV < 1) {
    @list = (15, 10);
}

my $maxValue = max(@list);

print "values: @list\nmax: $maxValue\n";
