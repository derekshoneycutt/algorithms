MODULE Main EXPORTS Main;
IMPORT Params,IO,Fmt,Text,Scan;

PROCEDURE Max(values: REF ARRAY OF INTEGER) : INTEGER =
    VAR current, i : INTEGER;
    BEGIN
        current := 0;
        FOR i := 0 TO LAST(values^) DO
            IF values[i] > current THEN
                current := values[i];
            END;
        END;
        RETURN current;
    END Max;

VAR
    values: REF ARRAY OF INTEGER;
    i, max: INTEGER;

BEGIN

    IF Params.Count > 1 THEN
        values := NEW(REF ARRAY OF INTEGER, Params.Count - 1);
        FOR i := 1 TO Params.Count - 1 DO
            values[i - 1] := Scan.Int(Params.Get(i));
        END;
    ELSE
        values := NEW(REF ARRAY OF INTEGER, 2);
        values[0] := 15;
        values[1] := 10;
    END;

    max := Max(values);

    IO.Put("values: [" & Fmt.Int(values[0]));
    FOR i := 1 TO LAST(values^) DO
        IO.Put(", " & Fmt.Int(values[i]));
    END;
    IO.Put("]\nmax: " & Fmt.Int(max) & "\n");
END Main.
