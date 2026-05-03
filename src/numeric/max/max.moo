/*
    This application gets the maximum value of a sequence of values
 */
:- module max.

:- interface.
:- import_module io.
:- import_module int.
:- import_module list.
:- import_module string.

:- pred max_list(list(T)::in, T::out) is semidet.
:- pred main(io::di, io::uo) is det.

:- implementation.

:- pred max_list_accum(list(T)::in, T::in, T::out) is det.
:- pred parse_int(string::in, int::out) is semidet.

/**
 * Gets the maximum value of a list
 */
max_list([], _) :-
    fail.
max_list([H | T], Max) :-
    max_list_accum(T, H, Max).

/**
 * Internal accumulator for the max_list function, accumulates maximum value
 */
max_list_accum([], Max, Max).
max_list_accum([H|T], TempMax, Max) :-
    compare(CompResult, H, TempMax),
    ( if CompResult = (>) then
        max_list_accum(T, H, Max)
    else
        max_list_accum(T, TempMax, Max)
    ).

/**
 * Parses a string into an integer
 */
parse_int(S, N) :-
    string.to_int(S, N).

/**
 *  The main entry point to our application
 */
main(!IO) :-
    io.command_line_arguments(ArgStrings, !IO),
    (
        if ArgStrings = [] then
            Values = [15, 10]
        else if list.map(parse_int, ArgStrings, Ints) then
            Values = Ints
        else
            Values = [15, 10]
    ),
    io.write_string(
        "values: " ++
        string.join_list(", ", list.map(string.from_int, Values)) ++
        "\n",
        !IO
    ),
    ( if max_list(Values, Max) then
        io.write_string("max: " ++ string.from_int(Max) ++ "\n", !IO)
    else
        io.write_string("no max\n", !IO)
    ).
