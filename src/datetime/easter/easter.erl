-module(easter).
-export([main/0]).

get_easter_for(Y) ->
    G = (Y  rem 19) + 1,
    C = (Y div 100) + 1,
    X = (3 * C div 4) - 12,
    Z = (((8 * C) + 5) div 25) - 5,
    D = ((5 * Y) div 4) - X - 10,
    Et = ((11 * G) + 20 + Z - X) rem 30,
    E =  if
        ((Et == 25) and (G > 11)) or (Et == 24) -> Et + 1;
        true -> Et
    end,
    Nfmt = 44 - E,
    Nfm = if
        Nfmt < 21 -> Nfmt + 30;
        true -> Nfmt
    end,
    N = Nfm + 7 - ((D + Nfm) rem 7),
    Month = if
        N > 31 -> "April";
        true -> "March"
    end,
    Day = if
        N > 31 -> N - 31;
        true -> N
    end,
    {Y, Month, Day}.

get_easters(Year, EndYear, Pid) when Year > EndYear ->
    Pid ! {stop};
get_easters(Year, EndYear, Pid) ->
    Pid ! {easter, get_easter_for(Year)},
    get_easters(Year + 1, EndYear, Pid).

print_easters_loop(From) ->
    receive
        {easter, Easter} ->
            io:format("   ~02B ~s, ~04B\n",
                [element(3, Easter), element(2, Easter), element(1, Easter)]),
            print_easters_loop(From);
        {stop} ->
            From ! {stop}
    end.
print_easters(From) ->
    io:format("Easters:~n"),
    print_easters_loop(From).

main() ->
    PrimaryPid = self(),
    Printer = spawn(fun() -> print_easters(PrimaryPid) end),
    spawn(fun() -> get_easters(1950, 2050, Printer) end),
    receive
     {stop} -> ok
    end.
