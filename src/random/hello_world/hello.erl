%%% Module: hello
%%% Description: Prints hello to the screen
-module(hello).
-export([main/0]).

%% @doc The main entry point for the application
main() ->
    % Print hello world and a new line
    io:format("Hello, world!~n"),
    ok.
