(*
    Get the maximum value of a sequence of values

    See additional modules e.g. IntMax from modula3_include/
*)
MODULE Main EXPORTS Main;
IMPORT Params,IO,Fmt,Text,Scan,IntMax;

VAR
    values: REF ARRAY OF INTEGER;
    i, max: INTEGER;

BEGIN
    (* Modula-3 makes the parameters pretty easy to get into integers *)
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

    (* Compute the maximum value using the IntMax module *)
    max := IntMax.Compute(values);

    IO.Put("values: [" & Fmt.Int(values[0]));
    FOR i := 1 TO LAST(values^) DO
        IO.Put(", " & Fmt.Int(values[i]));
    END;
    IO.Put("]\nmax: " & Fmt.Int(max) & "\n");
END Main.
