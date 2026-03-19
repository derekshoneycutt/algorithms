MODULE Main EXPORTS Main;
IMPORT IO,Fmt;

PROCEDURE SetPrimes(count: INTEGER; primes: REF ARRAY OF INTEGER) =
    VAR
        n, q, r, t, k : INTEGER;
        isPrime : BOOLEAN;
    BEGIN
        primes[0] := 2;
        n := 3;
        FOR index := 1 TO count - 1 DO
            primes[index] := n;

            isPrime := FALSE;
            WHILE NOT isPrime DO
                n := n + 2;

                q := 9999;
                r := 1;
                t := 0;
                k := 1;
                WHILE (r # 0) AND (q > t) DO
                    t := primes[k];
                    q := n DIV t;
                    r := n MOD t;
                    k := k + 1;
                END;

                isPrime := (r # 0) AND (q <= t);
            END;
        END;
    END SetPrimes;

PROCEDURE PrintPrimes(primes: REF ARRAY OF INTEGER) =
    VAR c : INTEGER;
    BEGIN
        IO.Put("First Five Hundred Primes\n");
        c := NUMBER(primes^) DIV 10;
        FOR i := 0 TO c - 1 DO
            IO.Put("     " &
                   Fmt.Pad(Fmt.Int(primes[i]), 4, '0') & " " &
                   Fmt.Pad(Fmt.Int(primes[i + c]), 4, '0') & " " &
                   Fmt.Pad(Fmt.Int(primes[i + c * 2]), 4, '0') & " " &
                   Fmt.Pad(Fmt.Int(primes[i + c * 3]), 4, '0') & " " &
                   Fmt.Pad(Fmt.Int(primes[i + c * 4]), 4, '0') & " " &
                   Fmt.Pad(Fmt.Int(primes[i + c * 5]), 4, '0') & " " &
                   Fmt.Pad(Fmt.Int(primes[i + c * 6]), 4, '0') & " " &
                   Fmt.Pad(Fmt.Int(primes[i + c * 7]), 4, '0') & " " &
                   Fmt.Pad(Fmt.Int(primes[i + c * 8]), 4, '0') & " " &
                   Fmt.Pad(Fmt.Int(primes[i + c * 9]), 4, '0') & " " &
                   "\n");
        END;
    END PrintPrimes;

VAR
    primes: REF ARRAY OF INTEGER;
BEGIN
    primes := NEW(REF ARRAY OF INTEGER, 500);
    SetPrimes(500, primes);
    PrintPrimes(primes);
END Main.
