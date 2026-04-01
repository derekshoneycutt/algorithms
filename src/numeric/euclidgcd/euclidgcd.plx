=for comment
    Calculate the GCD of two values and print it all to the screen
=cut comment

use strict;
use warnings;

# Calculate the GCD using Euclid's algorithm
sub euclidgcd {
    my $m = $_[0];
    my $n = $_[1];
    my $r;
    while ($n != 0) {
        $r = $m % $n;
        $m = $n;
        $n = $r;
    }
    return $m;
}

my $m = 15;
my $n = 10;

if (@ARGV >= 2) {
    ($m, $n) = @ARGV;
}

my $gcd = euclidgcd($m, $n);

print "$m $n\ngcd: $gcd\n";
