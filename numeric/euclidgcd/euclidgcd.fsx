
let euclidgcd (m_in: int, n_in: int) =
    let mutable m = m_in
    let mutable n = n_in
    let mutable r = m % n
    while r <> 0 do
        m <- n
        n <- r
        r <- m % n
    n

let mutable v_1 = 15
let mutable v_2 = 10

if fsi.CommandLineArgs.Length >= 2 then
    v_1 <- fsi.CommandLineArgs[0] |> int
    v_2 <- fsi.CommandLineArgs[1] |> int

printfn($"{v_1} {v_2}")
printfn($"{euclidgcd(v_1, v_2)}")
