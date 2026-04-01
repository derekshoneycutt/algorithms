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

// For fun with F#, we show using MailboxProcessor for messaging as well
// This creates a background task that calculates and prints GCD from 2 values.
let mailbox =
    MailboxProcessor.Start(fun inbox ->
        let rec receiver() = async {
            let! (m, n) = inbox.Receive()
            printfn($"{m} {n}\ngcd: {euclidgcd(m, n)}")
            return! receiver()
        }
        receiver()
    )

// We either get the first two values from the command line or use 15, 10
// and just send this pair to the mailbox
mailbox.Post(
    if fsi.CommandLineArgs.Length >= 3 then
        (fsi.CommandLineArgs[1] |> int, fsi.CommandLineArgs[2] |> int)
    else (15, 10))
