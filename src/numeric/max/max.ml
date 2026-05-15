(* Get the maximum value from a list of integers *)

(* Helper function to find the maximum value in a list with an initial state *)
let rec max_list_state (list : 'a list) (max : 'a) : 'a =
  match list with
  | [] -> max
  | head :: tail ->
    max_list_state tail (if head > max then head else max);;

(* Find the maximum value in a list *)
let rec max_list (list : 'a list) : 'a option =
  match list with
  | [] -> None
  | head :: tail -> Some (max_list_state tail head);;

(* Convert command line arguments to a list of integers, or use a default list *)
let argsAsInts default =
  let argc = Array.length Sys.argv in
  if argc > 1 then
    let useArray = Array.sub Sys.argv 1 (argc - 1) in
    let useList = Array.to_list useArray in
    (List.map (fun arg -> int_of_string arg) useList) else default;;

(* Print the elements of a list *)
let rec print_list list =
  match list with
  | [] -> ()
  | head :: [] -> Printf.printf "%d" head
  | head :: tail -> Printf.printf "%d; " head; print_list tail;;

let list = argsAsInts [15; 10] in
let maxValue =
	match (max_list list) with
	| Some v -> v
	| None -> 0 in

Printf.printf "values: ";
print_list list;
Printf.printf "\nmax: %d\n" maxValue;;
