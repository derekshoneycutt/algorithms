%%% Module: euclidgcd
%%% Description: Calculates the GCD between 2 values and prints it all to the screen
-module(euclidgcd).
-export([main/0, euclidgcd/2, print_all/0]).

%% @doc Calculates the GCD between two values with recursive form of Euclid's algorithm
%% 
%% @param m The first value to calculate the GCD for
%% @param n The second value to calculate the GCD for
%% @returns The GCD between the two values
euclidgcd(M, 0) -> M;
euclidgcd(M, N) -> euclidgcd(N, M rem N).

%% @doc Prints the two values and the GCD to the screen; using erlang process comms
print_all() ->
    receive
        {M, N} -> io:format("~p ~p~ngcd: ~p~n", [M, N, euclidgcd(M, N)])
    end.

%% @doc The main entry point to the application
main() ->
    % We spawn the print process and then send it the values we want to print
    % just to get familiar with erlang's patterns
    P = spawn(euclidgcd, print_all, []),
    Args = init:get_plain_arguments(),
    case Args of
        [Arg1Str, Arg2Str] ->
            P ! {list_to_integer(Arg1Str), list_to_integer(Arg2Str)};
        _Other ->
            P ! {15, 10}
    end,
    ok.
    
