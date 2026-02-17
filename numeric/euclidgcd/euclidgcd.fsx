
let rec euclidgcd (m: int, n: int) =
    let r = m % n
    match r with
    | 0 -> n
    | _ -> euclidgcd(n, r)

let v_1 =
    if fsi.CommandLineArgs.Length >= 2 then
        fsi.CommandLineArgs[0] |> int
    else 15

let v_2 =
    if fsi.CommandLineArgs.Length >= 2 then
        fsi.CommandLineArgs[1] |> int
    else 10

printfn($"{v_1} {v_2}\n{euclidgcd(v_1, v_2)}")
