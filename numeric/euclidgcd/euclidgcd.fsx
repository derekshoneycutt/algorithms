
let rec euclidgcd (m: int, n: int) =
    let r = m % n
    match r with
    | 0 -> n
    | _ -> euclidgcd(n, r)

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
    if fsi.CommandLineArgs.Length >= 2 then
        (fsi.CommandLineArgs[1] |> int, fsi.CommandLineArgs[2] |> int)
    else (15, 10))
