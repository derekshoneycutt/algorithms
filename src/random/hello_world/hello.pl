/*
    Prints hello to the screen.
 */
:- initialization(main).

/**
 * main().
 *
 * The main entry point to the application.
 */
main :-
    % we add \n in our write for prolog.
    write('Hello, world!\n'),
    halt.
