-module(euclidgcd).
-export([main/0, euclidgcd/2, print_all/0]).

euclidgcd(M, 0) -> M;
euclidgcd(M, N) -> euclidgcd(N, M rem N).

print_all() ->
    receive
        {M, N} -> io:format("~p ~p~ngcd: ~p~n", [M, N, euclidgcd(M, N)])
    end.

main() ->
    P = spawn(euclidgcd, print_all, []),
    Args = init:get_plain_arguments(),
    case Args of
        [Arg1Str, Arg2Str] ->
            try
                M = list_to_integer(Arg1Str),
                N = list_to_integer(Arg2Str),
                P ! {M, N}
            catch
                error:badarg ->
                    io:format("Invalid argument recieved.")
            end;
        _Other ->
            P ! {15, 10}
    end,
    ok.
    
