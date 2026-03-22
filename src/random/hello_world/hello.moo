/*
    This prints hello to the screen
 */
:- module hello.

:- interface.
:- import_module io.

:- pred main(io::di, io::uo) is det.

:- implementation.

main(!IO) :-
    % just write string; we add \n ourselves
    io.write_string("Hello, world!\n", !IO).
