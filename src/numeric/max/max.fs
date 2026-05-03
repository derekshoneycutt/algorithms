(*
    Find the maximum value from a sequence of numeric values
*)

/// <summary>
/// Get the maximum value of a list, reduce-style
/// </summary>
/// <param name="list">The list of integers to find the maximum value for</param>
/// <param name="max">The current maximum value</param>
/// <returns>The maximum value in the list</returns>
let rec max_state<'T when 'T : comparison> (list: 'T list) (max: 'T) =
    match list with
    | [] -> max
    | head :: tail ->
        max_state tail (if head > max then head else max)

/// <summary>
/// Get the maximum value of a list
/// </summary>
/// <param name="list">The list of integers to find the maximum value for</param>
/// <returns>The maximum value in the list</returns>
let max<'T when 'T : comparison> (list: 'T list) =
    match list with
    | [] -> Unchecked.defaultof<'T>
    | head :: tail ->
        max_state tail head

// Type definition for the messages we will be sending to the mailbox process,
// including a reply channel to wait for responses on
type NumsMsg = ProcessTuple of (int list * int) * AsyncReplyChannel<unit>

/// <summary>
/// The mailbox processor for handling asynchronous messages
/// </summary>
let mailbox =
    MailboxProcessor.Start(fun inbox ->
        let rec receiver() = async {
            let! (ProcessTuple((list, maxValue), replyChannel)) = inbox.Receive()
            let sep = ", "
            printfn $"values: [{String.concat sep (list |> List.map string)}]\nmax: {maxValue}"
            replyChannel.Reply()
            return! receiver()
        }
        receiver()
    )


async {
    // We either get the values from the command line or use 15, 10
    // and just send this to the mailbox
    mailbox.PostAndReply(fun reply ->
        let args = System.Environment.GetCommandLineArgs()
        let list : int list =
            if args.Length > 1 then
                [for arg in args |> Seq.skip 1 -> arg |> int]
            else [15; 10]
        let maxValue = max(list)
        ProcessTuple((list, maxValue), reply))
} |> Async.RunSynchronously
