(*
  Calculate the GCD for two values and print it all to the screen
*)
MODULE Main EXPORTS Main;
IMPORT Params,IO,Fmt,Text,Scan;

(* Calculate the GCD using Euclid's Method *)
PROCEDURE EuclidGcd(m, n: INTEGER) : INTEGER =
    VAR r : INTEGER;
    BEGIN
        WHILE n # 0 DO
            r := m MOD n;
            m := n;
            n := r;
        END;
        RETURN m;
    END EuclidGcd;

VAR 
  m, n, gcd: INTEGER;

BEGIN
  (* Look for 2 parameters or use 15, 10 *)
  IF Params.Count > 2 THEN
    m := Scan.Int(Params.Get(1));
    n := Scan.Int(Params.Get(2));
  ELSE
    m := 15;
    n := 10;
  END;

  gcd := EuclidGcd(m, n);
  IO.Put(Fmt.Int(m) & " " & Fmt.Int(n) & "\n");
  IO.Put("gcd: " & Fmt.Int(gcd) & "\n");
END Main.
