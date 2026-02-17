
let rec euclidgcd m n = 
  if n = 0 then m else euclidgcd n (m mod n);;

let m = if (Array.length Sys.argv) >= 3 then (int_of_string Sys.argv.(1)) else 15 in
let n = if (Array.length Sys.argv) >= 3 then (int_of_string Sys.argv.(2)) else 10 in
let result = euclidgcd m n in

Printf.printf "%d %d\ngcd: %d\n" m n result;;
