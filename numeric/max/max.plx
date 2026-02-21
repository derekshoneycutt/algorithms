#!/usr/bin/perl
use strict;
use warnings;

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
