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
            P ! {list_to_integer(Arg1Str), list_to_integer(Arg2Str)};
        _Other ->
            P ! {15, 10}
    end,
    ok.
    
