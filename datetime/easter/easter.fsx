open System

let get_easter_for year =
    let g = (year % 19) + 1
    let c = (year / 100) + 1
    let x = (3 * c / 4) - 12
    let z = (((8 * c) + 5) / 25) - 5
    let d = ((5 * year) / 4) - x - 10
    let et = ((11 * g) + 20 + z - x) % 30
    let e = if ((et = 25) && (g > 11)) || (et = 24) then et + 1 else et
    let nfmt = 44 - e
    let nfm = if nfmt < 21 then nfmt + 30 else nfmt
    let n = nfm + 7 - ((d + nfm) % 7)
    if n > 31 then new DateOnly(year, 4, n - 31)
    else new DateOnly(year, 3, n)

let rec get_easters year endYear = seq {
    if year <= endYear then
        yield get_easter_for(year)
        yield! get_easters (year + 1) endYear
    else ()
}

let print_easters (easters: seq<DateOnly>) =
    printfn $"Easters:"
    easters |> Seq.iter (fun easter ->
        printfn "   %s" (easter.ToString("dd MMMM, yyyy")))

print_easters (get_easters 1950 2050)
