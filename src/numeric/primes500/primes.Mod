MODULE primes;
IMPORT Out;

VAR
    primes: ARRAY 500 OF INTEGER;

PROCEDURE SetPrimes(count: INTEGER; VAR primes: ARRAY OF INTEGER);
    VAR
        n, q, r, t, k, index : INTEGER;
        isPrime : BOOLEAN;
    BEGIN
        primes[0] := 2;
        n := 3;
        FOR index := 1 TO count - 1 DO
            primes[index] := n;

            isPrime := FALSE;
            WHILE ~isPrime DO
                n := n + 2;

                q := 9999;
                r := 1;
                t := 0;
                k := 1;
                WHILE ((r # 0) & (q > t)) DO
                    t := primes[k];
                    q := n DIV t;
                    r := n MOD t;
                    k := k + 1
                END;

                isPrime := (r # 0) & (q <= t)
            END
        END
    END SetPrimes;

PROCEDURE PrintPrimes(primes: ARRAY OF INTEGER);
    VAR c, i : INTEGER;
    BEGIN
        Out.String("First Five Hundred Primes"); Out.Ln;
        c := SHORT(LEN(primes));
        c := c DIV 10;
        FOR i := 0 TO c - 1 DO
            Out.String("     "); Out.Int(primes[i], 4);
                Out.String(" "); Out.Int(primes[i + c], 4);
                Out.String(" "); Out.Int(primes[i + c * 2], 4);
                Out.String(" "); Out.Int(primes[i + c * 3], 4);
                Out.String(" "); Out.Int(primes[i + c * 4], 4);
                Out.String(" "); Out.Int(primes[i + c * 5], 4);
                Out.String(" "); Out.Int(primes[i + c * 6], 4);
                Out.String(" "); Out.Int(primes[i + c * 7], 4);
                Out.String(" "); Out.Int(primes[i + c * 8], 4);
                Out.String(" "); Out.Int(primes[i + c * 9], 4);
                Out.Ln
        END
    END PrintPrimes;

BEGIN
    SetPrimes(500, primes);
    PrintPrimes(primes)
END primes.
