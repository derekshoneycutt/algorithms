
let rec euclidgcd (m: int, n: int) =
    let r = m % n
    match r with
    | 0 -> n
    | _ -> euclidgcd(n, r)

let mutable v_1 = 15
let mutable v_2 = 10

if fsi.CommandLineArgs.Length >= 2 then
    v_1 <- fsi.CommandLineArgs[0] |> int
    v_2 <- fsi.CommandLineArgs[1] |> int

printfn($"{v_1} {v_2}")
printfn($"{euclidgcd(v_1, v_2)}")
