/*
    This calculates the GCD of 2 values.
 */
:- module euclidgcd.

:- interface.
:- import_module io.
:- import_module int.

:- pred main(io::di, io::uo) is cc_multi.
:- pred euclidgcd(int::in, int::in, int::out) is multi.

:- implementation.
:- import_module list.
:- import_module string.

/**
 *  Calculates the GCD of M and N, putting it in Gcd
 */
euclidgcd(M, 0, M) :- M > 0.
euclidgcd(M, N, Gcd) :-
    R = M mod N,
    euclidgcd(N, R, Gcd).

/**
 *  The main entry point to our application
 */
main(!IO) :-
    io.command_line_arguments(Args, !IO),
    ( Args = [Arg1, Arg2 | _] ->
        ( if string.to_int(string.strip(Arg1), M_Temp) then
            M = M_Temp
          else
            M = 15
        ),
        ( if string.to_int(string.strip(Arg2), N_Temp) then
            N = N_Temp
          else
            N = 10
        )
      ;
        M = 15,
        N = 10
    ),
    euclidgcd(M, N, Gcd),
    io.format("%d %d\ngcd: %d\n", [i(M), i(N), i(Gcd)], !IO).
