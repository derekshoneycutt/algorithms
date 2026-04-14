/*
 *  Calculates GCD via Euclid's algorithm
 */
:- initialization(main).

/**
 * euclidgcd(M, N, Gcd)
 *
 * Calculates the greatest common denominator between 2 values
 */
euclidgcd(M, 0, M) :- M > 0.
euclidgcd(M, N, Gcd) :-
    R is M mod N,
    euclidgcd(N, R, Gcd).

/**
 * extract_args([], A, B)
 *
 * Extracts the first two command line arguments, if they are available
 */
extract_args([A, B | _], A, B) :- !.
extract_args([A], A, 'default') :- !.
extract_args([], 'default', 'default').

/**
 * parse_integer(Atom, Default, Value)
 *
 * Attempts to parse the given string Atom into a number value, or fills
 * Value with a default value when that is unsuccessful.
 */
parse_integer('default', Default, Default) :- !.
parse_integer(Atom, _, Integer) :-
    atom_chars(Atom, Chars),
    number_chars(Integer, Chars),
    integer(Integer), !.
parse_integer(_, Default, Default). % Fallback if it's not a valid number

/**
 * main().
 *
 * The main entry point to the application.
 */
main :-
    argument_list(Args),
    extract_args(Args, RawArg1, RawArg2),
    parse_integer(RawArg1, 15, M),
    parse_integer(RawArg2, 10, N),
    euclidgcd(M, N, Gcd),
    format('~d ~d~ngcd: ~d~n', [M, N, Gcd]),
    halt.
