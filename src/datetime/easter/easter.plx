use strict;
use warnings;
use integer;
use Time::Local;
use POSIX qw(strftime);

sub get_easter_for {
    my $year = $_[0];
    my $g = ($year % 19) + 1;
    my $c = ($year / 100) + 1;
    my $x = (3 * $c / 4) - 12;
    my $z = (((8 * $c) + 5) / 25) - 5;
    my $d = (5 * $year / 4) - $x - 10;
    my $e = ((11 * $g) + 20 + $z - $x) % 30;
    if ((($e == 25) && ($g > 11)) || ($e == 24)) {
        ++$e;
    }
    my $n = 44 - $e;
    if ($n < 21) {
        $n += 30;
    }
    $n += 7 - (($d + $n) % 7);

    if ($n > 31) {
        return timelocal(0, 0, 0, $n - 31, 3, $year);
    }
    return timelocal(0, 0, 0, $n, 2, $year);
}

# For perl... just... just normal...
sub get_easters {
    my $startYear = $_[0];
    my $endYear = $_[1];
    my @easters = ();
    foreach my $easter ($startYear .. $endYear) {
        push @easters, get_easter_for($easter);
    }
    return @easters
}

sub print_easters {
    my @easters = @_;
    print "Easters:\n";
    foreach my $easter (@easters) {
        my $formatted_date = strftime("%d %B, %Y", localtime($easter));
        print "   $formatted_date\n";
    }
}

print_easters(get_easters(1950, 2050));
