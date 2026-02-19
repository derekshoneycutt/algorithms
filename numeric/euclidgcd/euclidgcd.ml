
let rec euclidgcd m n = 
  if n = 0 then m else euclidgcd n (m mod n);;

let argAsInt index default =
  if (Array.length Sys.argv) >= 3 then
    (int_of_string Sys.argv.(index)) else default;;

let m = argAsInt 1 15 in
let n = argAsInt 2 10 in
let result = euclidgcd m n in

Printf.printf "%d %d\ngcd: %d\n" m n result;;
