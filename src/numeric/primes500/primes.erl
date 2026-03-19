-module(primes).
-export([main/0]).

sieve_loop(N) ->
    receive
        {testCandidate, From, Candidate} ->
            From ! {tested, self(), Candidate rem N /= 0},
            sieve_loop(N);
        {stop} ->
            ok
    end.

sieve([], _, _) -> ok;
sieve([H|T], From, Candidate) ->
    H ! {testCandidate, From, Candidate},
    sieve(T, From, Candidate).

exit_sieve([]) -> ok;
exit_sieve([H|T]) ->
    H ! {stop},
    exit_sieve(T).

test_loop([], From) -> From ! {isPrime};
test_loop(Sieve, From) ->
    receive
        {tested, Pid, true} -> test_loop(Sieve -- [Pid], From);
        {tested, _, false} -> From ! {notPrime}
    end.

first_n(N, _, _, _) when N < 1 -> [];
first_n(N, _, _, _) when N == 1 -> [2];
first_n(N, Prior, Sieve, _) when length(Prior) >= N ->
    exit_sieve(Sieve),
    Prior;
first_n(N, [], _, _) ->
    Sieve3 = spawn(fun() -> sieve_loop(3) end),
    first_n(N, [2,3], [Sieve3], 5);
first_n(N, Prior, Sieve, Candidate) ->
    ThisPid = self(),
    Tester = spawn(fun() -> test_loop(Sieve, ThisPid) end),
    sieve(Sieve, Tester, Candidate),
    receive
        {isPrime} ->
            NewPid = spawn(fun() -> sieve_loop(Candidate) end),
            first_n(N, Prior ++ [Candidate], Sieve ++ [NewPid], Candidate + 2);
        {notPrime} ->
            first_n(N, Prior, Sieve, Candidate + 2)
    end.

first_n(N, To) -> To ! {printPrimes, first_n(N, [], [], 2)}.

prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, []) ->
    {P1, P2, P3, P4, P5, P6, P7, P8, P9, P10};
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P1) < 50 ->
    prime_split_to_print(P1 ++ [H], P2, P3, P4, P5, P6, P7, P8, P9, P10, T);
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P2) < 50 ->
    prime_split_to_print(P1, P2 ++ [H], P3, P4, P5, P6, P7, P8, P9, P10, T);
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P3) < 50 ->
    prime_split_to_print(P1, P2, P3 ++ [H], P4, P5, P6, P7, P8, P9, P10, T);
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P4) < 50 ->
    prime_split_to_print(P1, P2, P3, P4 ++ [H], P5, P6, P7, P8, P9, P10, T);
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P5) < 50 ->
    prime_split_to_print(P1, P2, P3, P4, P5 ++ [H], P6, P7, P8, P9, P10, T);
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P6) < 50 ->
    prime_split_to_print(P1, P2, P3, P4, P5, P6 ++ [H], P7, P8, P9, P10, T);
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P7) < 50 ->
    prime_split_to_print(P1, P2, P3, P4, P5, P6, P7 ++ [H], P8, P9, P10, T);
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P8) < 50 ->
    prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8 ++ [H], P9, P10, T);
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P9) < 50 ->
    prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9 ++ [H], P10, T);
prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T]) ->
    prime_split_to_print(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10 ++ [H], T).
prime_split_to_print(Primes) ->
    prime_split_to_print([], [], [], [], [], [], [], [], [], [], Primes).

print_primes_lines([], [], [], [], [], [], [], [], [], []) -> ok;
print_primes_lines([H1|T1], [H2|T2], [H3|T3], [H4|T4], [H5|T5],
    [H6|T6], [H7|T7], [H8|T8], [H9|T9], [H10|T10]) ->
    io:format("     ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~n",
        [H1, H2, H3, H4, H5, H6, H7, H8, H9, H10]),
    print_primes_lines(T1, T2, T3, T4, T5, T6, T7, T8, T9, T10).
print_primes_lines(Primes) ->
    SplitPrimes = prime_split_to_print(Primes),
    print_primes_lines(element(1, SplitPrimes), element(2, SplitPrimes),
        element(3, SplitPrimes), element(4, SplitPrimes), element(5, SplitPrimes),
        element(6, SplitPrimes), element(7, SplitPrimes), element(8, SplitPrimes),
        element(9, SplitPrimes), element(10, SplitPrimes)).

print_primes(From) ->
    receive
        {printPrimes, Primes} ->
            io:format("First Five Hundred Primes~n"),
            print_primes_lines(Primes),
            From ! {stop}
    end.

main() ->
    PrimaryPid = self(),
    Printer = spawn(fun() -> print_primes(PrimaryPid) end),
    spawn(fun() -> first_n(500, Printer) end),
    receive
        {stop} -> ok
    end.
