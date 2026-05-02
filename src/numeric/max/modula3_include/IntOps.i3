(* Interface description for the IntOps module, containing the operations for integer comparison *)
INTERFACE IntOps;

(* Type definition for integer values *)
TYPE T = INTEGER;

(* Procedure to compare two integer values *)
PROCEDURE Compare(a, b: T): INTEGER;

END IntOps.
