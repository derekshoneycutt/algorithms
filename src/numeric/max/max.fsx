
let rec max_state list max =
    match list with
    | [] -> max
    | head :: tail ->
        max_state tail (if head > max then head else max)

let max list =
    match list with
    | [] -> 0
    | head :: tail ->
        max_state tail head

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
