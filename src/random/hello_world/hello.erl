%%% Module: hello
%%% Description: Prints hello to the screen
-module(hello).
-export([main/0]).

% Comment

%% @doc The main entry point for the application
main() ->
    io:format("Hello, world!~n"),
    ok.
