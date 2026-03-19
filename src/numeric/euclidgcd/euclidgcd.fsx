
let rec euclidgcd (m: int, n: int) =
    match n with
    | 0 -> m
    | _ -> euclidgcd(n, m % n)

let mailbox =
    MailboxProcessor.Start(fun inbox ->
        let rec receiver() = async {
            let! (m, n) = inbox.Receive()
            printfn($"{m} {n}\ngcd: {euclidgcd(m, n)}")
            return! receiver()
        }
        receiver()
    )

mailbox.Post(
    if fsi.CommandLineArgs.Length >= 3 then
        (fsi.CommandLineArgs[1] |> int, fsi.CommandLineArgs[2] |> int)
    else (15, 10))
