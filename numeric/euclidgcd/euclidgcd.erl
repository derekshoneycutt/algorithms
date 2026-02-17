-module(euclidgcd).
-export([main/0, euclidgcd/2]).

euclidgcd(M, 0) -> M;
euclidgcd(M, N) -> euclidgcd(N, M rem N).

print_all(M, N) ->
    io:format("~p ~p~n~p~n", [M, N, euclidgcd(M, N)]).

main() ->
    Args = init:get_plain_arguments(),
    case Args of
        [Arg1Str, Arg2Str] ->
            try
                M = list_to_integer(Arg1Str),
                N = list_to_integer(Arg2Str),
                print_all(M, N)
            catch
                error:badarg ->
                    io:format("Invalid argument recieved.")
            end;
        _Other ->
            print_all(15, 10)
    end,
    ok.
    
