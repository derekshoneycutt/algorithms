(*
    Module containing utilities for working with strings
*)
MODULE StringUtils;

(* Pulls an integer value from a string *)
PROCEDURE StringToInt*(s: ARRAY OF CHAR; VAR value: INTEGER): BOOLEAN;
    VAR
        index, res: INTEGER;
    BEGIN
        res := 0;
        index := 0;
        WHILE (s[index] >= "0") & (s[index] <= "9") DO
            res := res * 10 + (ORD(s[index]) - ORD("0"));
            INC(index)
        END;
        value := res;
        RETURN (index > 0);
    END StringToInt;

END StringUtils.