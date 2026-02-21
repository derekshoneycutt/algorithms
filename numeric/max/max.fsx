
let rec max list =
    match list with
    | [] -> 0
    | head :: tail ->
        let tmax = max tail
        if head > tmax then head else tmax

let mailbox =
    MailboxProcessor.Start(fun inbox ->
        let rec receiver() = async {
            let! (list, maxValue) = inbox.Receive()
            let sep = ", "
            printfn $"values: [{String.concat sep (list |> List.map string)}]\nmax: {maxValue}"
            return! receiver()
        }
        receiver()
    )

let list =
    if fsi.CommandLineArgs.Length > 1 then
        [for arg in fsi.CommandLineArgs |> Seq.skip 1 -> arg |> int]
    else [15; 10]

let maxValue = max(list)

mailbox.Post((list, maxValue))
