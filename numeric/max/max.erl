-module(max).
-export([main/0, max_list/1]).

max_list([]) -> 0;
max_list([H|T]) -> max_list(T, H).
max_list([], Max) -> Max;
max_list([H|T], Max) when H > Max -> max_list(T, H);
max_list([_|T], Max) -> max_list(T, Max).

perform_max(P) ->
    receive
        {L} -> MaxVal = max_list(L), P ! {L, MaxVal}
    end.

argsAsInts([], Default) -> Default;
argsAsInts(List, _) ->
    lists:map(fun(Arg) -> list_to_integer(Arg) end, List).

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
