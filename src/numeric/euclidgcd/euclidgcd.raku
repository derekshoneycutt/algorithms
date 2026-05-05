=for comment
    Calculate the GCD of two values and print it all to the screen
=cut comment

use strict;

# Calculate the GCD using Euclid's algorithm
sub euclidgcd($m_in, $n_in) {
    my $m = $m_in;
    my $n = $n_in;
    my $r;
    while ($n != 0) {
        $r = $m % $n;
        $m = $n;
        $n = $r;
    }
    return $m;
}

# The main entry point to the application
sub MAIN($m = 15, $n = 10) {
    my $gcd = euclidgcd($m, $n);

    print "$m $n\ngcd: $gcd\n";
}
