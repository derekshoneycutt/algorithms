
let rec odds_from n = seq {
    yield if n % 2 = 0 then n + 1 else n
    yield! if n % 2 = 0 then odds_from (n + 3) else odds_from (n + 2)
}

let rec prime_sieve values = seq {
    match Seq.tryHead values with
    | Some head ->
        yield head
        let tail = Seq.tail values
        yield! prime_sieve (tail |>
            Seq.filter (fun value -> value % head <> 0))
    | None -> ()
}

let primes = seq {
    let all_candidates = seq {
        yield 2
        yield! odds_from 3
    }
    yield! prime_sieve all_candidates
}

let print_line (list: list<int>) index =
    let line = ($"     %04d{list.[index]} %04d{list.[(index + 50)]}" +
        $" %04d{list.[(index + 100)]} %04d{list.[(index + 150)]}" +
        $" %04d{list.[(index + 200)]} %04d{list.[(index + 250)]}" +
        $" %04d{list.[(index + 300)]} %04d{list.[(index + 350)]}" +
        $" %04d{list.[(index + 400)]} %04d{list.[(index + 450)]}")
    printfn $"{line}"

let rec print_lines (primes: list<int>) from_index =
    if from_index >= 50 then ()
    else
        print_line primes from_index
        print_lines primes (from_index + 1)

let print_primes primes = print_lines primes 0

let mailbox =
    MailboxProcessor.Start(fun inbox ->
        let rec receiver() = async {
            let! (primes) = inbox.Receive()
            printfn $"First Five Hundred Primes"
            print_primes primes
            return! receiver()
        }
        receiver()
    )

mailbox.Post((Seq.take 500 primes |> Seq.toList))
