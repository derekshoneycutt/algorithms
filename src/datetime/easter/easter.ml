
type 'a stream = Nil | Cons of 'a * 'a stream Lazy.t

let rec years n m =
  if n > m then Nil
  else Cons (n, lazy (years (n + 1) m))

let get_easter_for y =
  let g = y mod 19 + 1 in
  let c = y / 100 + 1 in
  let x = 3 * c / 4 - 12 in
  let z = (8 * c + 5) / 25 - 5 in
  let d = 5 * y / 4 - x - 10 in
  let et = ((11 * g) + 20 + z - x) mod 30 in
  let e = if et == 25 && g > 11 || et == 24 then et + 1 else et in
  let nfmt = 44 - e in
  let nfm = if nfmt < 21 then nfmt + 30 else nfmt in
  let n = nfm + 7 - (d + nfm) mod 7 in
  let month = if n > 31 then "April" else "March" in
  let day = if n > 31 then n - 31 else n in
  (y, month, day)

let rec easters_for years =
  match years with
  | Nil -> Nil
  | Cons (year, lazy tail) -> Cons (get_easter_for year, lazy (easters_for tail))

let rec output easters =
  match easters with
  | Nil -> ()
  | Cons (easter, lazy tail) ->
    let (year, month, day) = easter in
    Printf.printf "   %02d %s %04d\n" day month year;
    output tail;;

Printf.printf "Easters:\n";
output (easters_for (years 1950 2050))
