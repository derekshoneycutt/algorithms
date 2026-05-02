(* Implementation of the IntOps module, containing the operations for integer comparison *)
MODULE IntOps;

(* Procedure to compare two integer values *)
PROCEDURE Compare(a, b: T): INTEGER =
  BEGIN
    RETURN a - b;
  END Compare;

BEGIN
END IntOps.
