(* Interface description for the Max module, containing the generic interface for computing the maximum value of a sequence of values *)
GENERIC INTERFACE Max(Ops);

(* Type definition for value type being operated on to find the maximum value *)
TYPE
  Array = REF ARRAY OF Ops.T;

(* Compute the maximum value of a sequence of values *)
PROCEDURE Compute(values: Array): Ops.T;

END Max.
