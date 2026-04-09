(*
    Calculate the GCD between 2 values and print it all to the screen
*)

/// <summary>
/// Calculate the GCD of two values using Euclid's method
/// </summary>
/// <param name="m">The first value to calculate the GCD for</param>
/// <param name="n">The second value to calculate the GCD for</param>
/// <returns>The GCD for the two values</returns>
let rec euclidgcd (m: int, n: int) =
    match n with
    | 0 -> m
    | _ -> euclidgcd(n, m % n)

// Type definition for the messages we will be sending to the mailbox process,
// including a reply channel to wait for responses on
type NumsMsg = ProcessTuple of (int * int) * AsyncReplyChannel<unit>

// For fun with F#, we show using MailboxProcessor for messaging as well
// This creates a background task that calculates and prints GCD from 2 values.
let mailbox =
    MailboxProcessor.Start(fun inbox ->
        let rec receiver() = async {
            let! (ProcessTuple((m, n), replyChannel)) = inbox.Receive()
            printfn($"{m} {n}\ngcd: {euclidgcd(m, n)}")
            replyChannel.Reply()
            return! receiver()
        }
        receiver()
    )

async {
// We either get the first two values from the command line or use 15, 10
// and just send this pair to the mailbox
    mailbox.PostAndReply(fun reply ->
        let args = System.Environment.GetCommandLineArgs()
        if args.Length >= 3 then
            ProcessTuple((args[1] |> int, args[2] |> int), reply)
        else ProcessTuple((15, 10), reply))
} |> Async.RunSynchronously
