
let rec max_list_state list max =
  match list with
  | [] -> max
  | head :: tail ->
    max_list_state tail (if head > max then head else max);;

let rec max_list list =
  match list with
  | [] -> 0
  | head :: tail -> max_list_state tail head;;

let argsAsInts default =
  let argc = Array.length Sys.argv in
  if argc > 1 then
    let useArray = Array.sub Sys.argv 1 (argc - 1) in
    let useList = Array.to_list useArray in
    (List.map (fun arg -> int_of_string arg) useList) else default;;

let rec print_list list =
  match list with
  | [] -> ()
  | head :: [] -> Printf.printf "%d" head
  | head :: tail -> Printf.printf "%d; " head; print_list tail;;

let list = argsAsInts [15; 10] in
let maxValue = max_list list in

Printf.printf "values: ";
print_list list;
Printf.printf "\nmax: %d\n" maxValue;;

