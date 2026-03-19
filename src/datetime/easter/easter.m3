MODULE Main EXPORTS Main;
IMPORT IO,Fmt;

TYPE
    DATE = RECORD
        day: INTEGER;
        month: TEXT;
        year: INTEGER;
    END;

PROCEDURE PrintDate(date: DATE) =
    BEGIN
        IO.Put("   " & Fmt.Pad(Fmt.Int(date.day), 2, '0') &
            " " & date.month & ", " & Fmt.Pad(Fmt.Int(date.year), 4, '0') &
            "\n");
    END PrintDate;

PROCEDURE GetEasterFor(year: INTEGER) : DATE =
    VAR
        g, c, x, z, d, e, n : INTEGER;
        ret : DATE;
    BEGIN
        g := (year MOD 19) + 1;
        c := (year DIV 100) + 1;
        x := (3 * c DIV 4) - 12;
        z := (((8 * c) + 5) DIV 25) - 5;
        d := (5 * year DIV 4) - x - 10;
        e := ((11 * g) + 20 + z - x) MOD 30;
        IF ((e = 25) AND (g > 11)) OR (e = 24) THEN
            e := e + 1;
        END;
        n := 44 - e;
        IF n < 21 THEN
            n := n + 30;
        END;
        n := n + 7 - ((d + n) MOD 7);

        ret.year := year;
        IF n > 31 THEN
            ret.day := n - 31;
            ret.month := "April";
        ELSE
            ret.day := n;
            ret.month := "March";
        END;
        RETURN ret;
    END GetEasterFor;

TYPE
    DATELOOPSTATE = RECORD
        current: DATE;
        endYear: INTEGER;
    END;

PROCEDURE InitEasters(VAR state: DATELOOPSTATE; startYear, endYear: INTEGER) =
    BEGIN
        state.current.year := startYear - 1;
        state.endYear := endYear;
    END InitEasters;

PROCEDURE NextEaster(VAR state: DATELOOPSTATE) : BOOLEAN =
    VAR newYear : INTEGER;
    BEGIN
        newYear := state.current.year + 1;
        IF newYear > state.endYear THEN
            RETURN FALSE;
        ELSE
            state.current := GetEasterFor(newYear);
            RETURN TRUE;
        END;
    END NextEaster;

PROCEDURE PrintEasters(VAR easters: DATELOOPSTATE) =
    BEGIN
        IO.Put("Easters:\n");
        WHILE NextEaster(easters) DO
            PrintDate(easters.current);
        END;
    END PrintEasters;

VAR state: DATELOOPSTATE;
BEGIN
    InitEasters(state, 1950, 2050);
    PrintEasters(state);
END Main.
