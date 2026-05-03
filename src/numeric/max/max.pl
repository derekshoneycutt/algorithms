/*
 *  This application takes a sequence of numbers and prints the maximum of those values
 */
:- initialization(main).

/**
 * max_of_list_accum(List, TempMax, Max)
 *
 * Accumulator method to accumulate the maximum from a list
 */
max_of_list_accum([], Max, Max).
max_of_list_accum([H | T], TempMax, Max) :-
    ( H > TempMax ->
        NewMax = H
    ;
        NewMax = TempMax
    ),
    max_of_list_accum(T, NewMax, Max).

/**
 * max_of_list(List, Max)
 *
 * Finds the maximum value in a list
 */
max_of_list([], _) :- !.
max_of_list([H | T], Max) :-
    max_of_list_accum(T, H, Max).

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
 * parse_integers(Atoms, Default, Values)
 *
 * Parses a list of strings into integers, using a default value for invalid entries.
 */
parse_integers([], _, []).
parse_integers([Atom | Atoms], Default, [Value | Values]) :-
    parse_integer(Atom, Default, Value),
    parse_integers(Atoms, Default, Values).

/**
 * main().
 *
 * The main entry point to the application.
 */
main :-
    argument_list(Args),
    ( Args = [] ->
        Values = [15, 10]
    ;
        parse_integers(Args, 0, Values)
    ),
    max_of_list(Values, Max),
    format('values: ~w~n', [Values]),
    format('max: ~d~n', [Max]),
    halt.
