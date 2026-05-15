NB. Get the maximum value of a set of values

3 : 0 ''

user_args =: 2 }. ARGV
if. 0 = # user_args do.
    args =: 15 10
else.
    args =: > ". each user_args
end.

maxv =: >./ args

echo 'values: ', ": args
echo 'max: ', ": maxv

)
exit 0
