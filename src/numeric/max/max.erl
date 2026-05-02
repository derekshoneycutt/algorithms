%%% Module: max
%%% Description: Finds the maximum of a sequence of numeric values
-module(max).
-export([main/0, max_list/1]).

%% @doc Finds the maximum value of a list
%% 
%% @param List The list of values to find the maximum of
%% @return The maximum value in the list
max_list([]) -> 0;
max_list([H|T]) -> max_list(T, H).
max_list([], Max) -> Max;
max_list([H|T], Max) when H > Max -> max_list(T, H);
max_list([_|T], Max) -> max_list(T, Max).

%% @doc Waits for a message containing a list, calculates the max value, and sends it back to the given PID
perform_max(P) ->
    receive
        {L} -> MaxVal = max_list(L), P ! {L, MaxVal}
    end.

%% @doc Converts a list of string arguments to integers, using a default list if the input list is empty
argsAsInts([], Default) -> Default;
argsAsInts(List, _) ->
    lists:map(fun(Arg) -> list_to_integer(Arg) end, List).

%% @doc The main entry point to the application
main() ->
    MainP = self(),
    M = spawn(fun() -> perform_max(MainP) end),

    Args = init:get_plain_arguments(),
    List = argsAsInts(Args, [15, 10]),
    M ! {List},

    receive
        {L, Max} -> io:format("values: ~w~nmax: ~p~n", [L, Max])
    end,
    ok.
