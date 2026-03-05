-module(primes).
-export([main/0]).

sieveLoop(N) ->
    receive
        {'TEST', From, Candidate} ->
            From ! {'TESTED', self(), Candidate rem N /= 0},
            sieveLoop(N);
        {'EXIT', stop} ->
            ok
    end.

sieve([], _, _) -> ok;
sieve([H|T], From, Candidate) ->
    H ! {'TEST', From, Candidate},
    sieve(T, From, Candidate).

exitSieve([]) -> ok;
exitSieve([H|T]) ->
    H ! {'EXIT', stop},
    exitSieve(T).

testLoop([], From) -> From ! {'SUCCESS'};
testLoop(Sieve, From) ->
    receive
        {'TESTED', Pid, true} -> testLoop(Sieve -- [Pid], From);
        {'TESTED', _, false} -> From ! {'FAIL'}
    end.

first_n(N, _, _, _) when N < 1 -> [];
first_n(N, _, _, _) when N == 1 -> [2];
first_n(N, Prior, Sieve, _) when length(Prior) >= N ->
    exitSieve(Sieve),
    Prior;
first_n(N, [], _, _) ->
    Sieve3 = spawn(fun() -> sieveLoop(3) end),
    first_n(N, [2,3], [Sieve3], 5);
first_n(N, Prior, Sieve, Candidate) ->
    ThisPid = self(),
    Tester = spawn(fun() -> testLoop(Sieve, ThisPid) end),
    sieve(Sieve, Tester, Candidate),
    receive
        {'SUCCESS'} ->
            NewPid = spawn(fun() -> sieveLoop(Candidate) end),
            first_n(N, Prior ++ [Candidate], Sieve ++ [NewPid], Candidate + 2);
        {'FAIL'} ->
            first_n(N, Prior, Sieve, Candidate + 2)
    end.

firstN(N, To) -> To ! {first_n(N, [], [], 2)}.

primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, []) ->
    {P1, P2, P3, P4, P5, P6, P7, P8, P9, P10};
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P1) < 50 ->
    primeSplitToPrint(P1 ++ [H], P2, P3, P4, P5, P6, P7, P8, P9, P10, T);
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P2) < 50 ->
    primeSplitToPrint(P1, P2 ++ [H], P3, P4, P5, P6, P7, P8, P9, P10, T);
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P3) < 50 ->
    primeSplitToPrint(P1, P2, P3 ++ [H], P4, P5, P6, P7, P8, P9, P10, T);
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P4) < 50 ->
    primeSplitToPrint(P1, P2, P3, P4 ++ [H], P5, P6, P7, P8, P9, P10, T);
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P5) < 50 ->
    primeSplitToPrint(P1, P2, P3, P4, P5 ++ [H], P6, P7, P8, P9, P10, T);
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P6) < 50 ->
    primeSplitToPrint(P1, P2, P3, P4, P5, P6 ++ [H], P7, P8, P9, P10, T);
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P7) < 50 ->
    primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7 ++ [H], P8, P9, P10, T);
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P8) < 50 ->
    primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8 ++ [H], P9, P10, T);
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T])
    when length(P9) < 50 ->
    primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9 ++ [H], P10, T);
primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, [H | T]) ->
    primeSplitToPrint(P1, P2, P3, P4, P5, P6, P7, P8, P9, P10 ++ [H], T).
primeSplitToPrint(Primes) ->
    primeSplitToPrint([], [], [], [], [], [], [], [], [], [], Primes).

printPrimesLines([], [], [], [], [], [], [], [], [], []) -> ok;
printPrimesLines([H1|T1], [H2|T2], [H3|T3], [H4|T4], [H5|T5],
    [H6|T6], [H7|T7], [H8|T8], [H9|T9], [H10|T10]) ->
    io:format("     ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~4..0B ~n",
        [H1, H2, H3, H4, H5, H6, H7, H8, H9, H10]),
    printPrimesLines(T1, T2, T3, T4, T5, T6, T7, T8, T9, T10).
printPrimesLines(Primes) ->
    SplitPrimes = primeSplitToPrint(Primes),
    printPrimesLines(element(1, SplitPrimes), element(2, SplitPrimes),
        element(3, SplitPrimes), element(4, SplitPrimes), element(5, SplitPrimes),
        element(6, SplitPrimes), element(7, SplitPrimes), element(8, SplitPrimes),
        element(9, SplitPrimes), element(10, SplitPrimes)).

printPrimes(From) ->
    receive
        {Primes} ->
            io:format("First Five Hundred Primes~n"),
            printPrimesLines(Primes),
            From ! {'EXIT'}
    end.

main() ->
    Primary = self(),
    Printer = spawn(fun() -> printPrimes(Primary) end),
    spawn(fun() -> firstN(500, Printer) end),
    receive
        {'EXIT'} -> ok
    end.
