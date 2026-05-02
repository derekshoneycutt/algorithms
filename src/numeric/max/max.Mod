(*
    Gets the maximum value of some sequence of values
*)

MODULE max;
IMPORT Args, Out, StringUtils;

TYPE IntArrayPtr = POINTER TO ARRAY OF INTEGER;

VAR
    values: IntArrayPtr;
    i, max, n: INTEGER;
    arg : ARRAY 22 OF CHAR;

(* Gets the maximum value of some sequence of integers *)
PROCEDURE Max(count: INTEGER; VAR values: IntArrayPtr) : INTEGER;
    VAR
        current, i : INTEGER;
    BEGIN
        current := 0;
        FOR i := 0 TO count - 1 DO
            IF values[i] > current THEN
                current := values[i];
            END;
        END;
        RETURN current;
    END Max;

BEGIN
    n := 0;
    IF Args.argc > 1 THEN
        NEW(values, Args.argc - 1);
        FOR i := 1 TO Args.argc - 1 DO
            Args.Get(i, arg);
            IF StringUtils.StringToInt(arg, max) THEN
                values[i - 1] := max;
                n := n + 1
            END
        END
    END;
    IF n < 1 THEN
        NEW(values, 2);
        values[0] := 15;
        values[1] := 10;
        n := 2
    END;

    max := Max(n, values);

    Out.String("values: [");
    Out.Int(values[0], 0);
    FOR i := 1 TO n - 1 DO
        Out.String(", "); Out.Int(values[i], 0);
    END;
    Out.String("]"); Out.Ln;
    Out.String("max: "); Out.Int(max, 0); Out.Ln
END max.
