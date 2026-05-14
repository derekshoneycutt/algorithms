NB. Calculates the GCD of 2 values

3 : 0 ''

m =: 15
n =: 10
num_args =: # ARGV
if. num_args > 2 do. m =: ". > 2 { ARGV end.
if. num_args > 3 do. n =: ". > 3 { ARGV end.

gcd =: m +. n

mboxed =: ": m
echo mboxed, ' ', ": n
echo 'gcd: ', ": gcd

)
exit 0
