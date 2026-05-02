(* Implementation of the generic Max module *)
GENERIC MODULE Max(Ops);

(* Compute the maximum value of a sequence of values using the Ops.Compare procedure *)
PROCEDURE Compute(values: Array): Ops.T =
  VAR current: Ops.T; i: INTEGER;
  BEGIN
    current := values[0];
    FOR i := 1 TO LAST(values^) DO
      IF Ops.Compare(values[i], current) > 0 THEN
        current := values[i];
      END;
    END;
    RETURN current;
  END Compute;

BEGIN
END Max.
