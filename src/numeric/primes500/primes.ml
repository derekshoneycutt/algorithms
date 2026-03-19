
type 'a stream = Cons of 'a * 'a stream Lazy.t

let rec odds_from n =
  match n mod 2 with
  | 1 -> Cons (n, lazy (odds_from (n + 2)))
  | _ -> Cons (n + 1, lazy (odds_from (n + 3)))

let rec filter p (Cons (h, t)) = 
    if p h then
      Cons (h, lazy (filter p (Lazy.force t)))
    else
      filter p (Lazy.force t)

let rec prime_sieve (Cons (h, t)) =
  Cons (h, lazy (prime_sieve (filter (fun v -> (v mod h) != 0) (Lazy.force t))))

let rec primes =
  Cons (2, lazy (prime_sieve (odds_from 3)))

let rec take n (Cons (h, t)) =
  if n <= 0 then []
  else h :: take (n - 1) (Lazy.force t)

let rec print_line list index =
  Printf.printf "     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d\n"
    (List.nth list index) (List.nth list (index + 50))
    (List.nth list (index + 100)) (List.nth list (index + 150))
    (List.nth list (index + 200)) (List.nth list (index + 250))
    (List.nth list (index + 300)) (List.nth list (index + 350))
    (List.nth list (index + 400)) (List.nth list (index + 450))

let rec print_lines list index =
  match index with
  | x when x >= 50 -> ()
  | _ ->
    print_line list index;
    print_lines list (index + 1)

let rec print_primes primes =
  Printf.printf "First Five Hundred Primes\n";
  print_lines primes 0

let rec print_list list =
  match list with
  | [] -> ()
  | head :: [] -> Printf.printf "%d" head
  | head :: tail -> Printf.printf "%d; " head; print_list tail;;

print_primes (take 500 primes)
