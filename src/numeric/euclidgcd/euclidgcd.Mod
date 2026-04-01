(*
    Calculate the GCD of two values and print it all to the screen
*)
MODULE euclidgcd;
IMPORT Args, Out;

VAR
    m, n, gcd, res: INTEGER;
    arg : ARRAY 22 OF CHAR;

(* Performs the GCD calculation with Euclid's method *)
PROCEDURE EuclidGcd(m, n: INTEGER) : INTEGER;
    VAR r : INTEGER;
BEGIN
    WHILE n # 0 DO
        r := m MOD n;
        m := n;
        n := r
    END;
    RETURN m;
END EuclidGcd;

(* Attempt to convert a string from command line arguments to an integer *)
PROCEDURE StringToInt(s: ARRAY OF CHAR; VAR value: INTEGER): BOOLEAN;
    VAR i, res: INTEGER;
BEGIN
    res := 0;
    i := 0;
    WHILE (s[i] >= "0") & (s[i] <= "9") DO
        res := res * 10 + (ORD(s[i]) - ORD("0"));
        INC(i)
    END;
    value := res;
    RETURN (i > 0);
END StringToInt;

(* Main procedure of the application *)
BEGIN
    (* Try to get first 2 command lines, or use 15, 10 *)
    IF Args.argc > 2 THEN
        Args.Get(1, arg);
        IF ~StringToInt(arg, m) THEN
            m := 15;
        END;
        Args.Get(2, arg);
        IF ~StringToInt(arg, n) THEN
            n := 10
        END
    ELSE
        m := 15;
        n := 10;
    END;

    gcd := EuclidGcd(m, n);

    Out.Int(m, 0); Out.String(" "); Out.Int(n, 0); Out.Ln;
    Out.String("gcd: "); Out.Int(gcd, 0); Out.Ln
END euclidgcd.
