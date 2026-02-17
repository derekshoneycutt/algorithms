#!/usr/bin/perl
use strict;
use warnings;

sub euclidgcd {
    my $m = $_[0];
    my $n = $_[1];
    my $r = $m % $n;
    while ($r != 0) {
        $m = $n;
        $n = $r;
        $r = $m % $n;
    }
    return $n;
}

my $v_1 = 15;
my $v_2 = 10;

if (@ARGV >= 2) {
    ($v_1, $v_2) = @ARGV;
}

print "$v_2 $v_2\n";
my $gcd = euclidgcd($v_1, $v_2);
print "$gcd\n";
