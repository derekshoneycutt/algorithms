#!/usr/bin/perl
use strict;
use warnings;
use builtin 'false';

sub getprimes {
    my @primes = (2);
    my $n = 3;

    foreach my $j (1..500) {
        push @primes, $n;

        my $is_prime = false;
        while (!$is_prime) {
            $n += 2;

            my $q = 9999;
            my $r = 1;
            my $t = 0;
            for (my $k = 1; ($r != 0) && ($q > $r); $k++) {
                $t = $primes[$k];
                $q = $n / $t;
                $r = $n % $t;
            }

            $is_prime = ($r != 0) && ($q <= $t);
        }
    }

    return @primes;
}

sub printprimes {
    my @primes = @_;
    print "First Five Hundred Primes\n";
    for (my $i = 0; $i < 50; ++$i) {
        print sprintf("     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d\n",
            $primes[$i], $primes[$i + 50], $primes[$i + 100], $primes[$i + 150],
            $primes[$i + 200], $primes[$i + 250], $primes[$i + 300],
            $primes[$i + 350], $primes[$i + 400], $primes[$i + 450])
    }
}

printprimes(getprimes());
