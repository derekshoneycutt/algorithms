import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.ZoneId

fun GetEasterFor(year: Int) : LocalDate {
    var g = (year % 19) + 1
    var c = (year / 100) + 1
    var x = (3 * c / 4) - 12
    var z = (((8 * c) + 5) / 25) - 5
    var d = (5 * year / 4) - x - 10
    var e = ((11 * g) + 20 + z - x) % 30
    if (((e == 25) && (g > 11)) || (e == 24))
    {
        ++e
    }
    var n = 44 - e
    if (n < 21)
    {
        n += 30
    }
    n += 7 - ((d + n) % 7)

    if (n > 31) {
        return LocalDate.of(year, 4,  n - 31)
    }
    return LocalDate.of(year, 3, n)
}

fun GetEasters(startYear: Int, endYear: Int) = sequence {
    for (year in startYear .. endYear) {
        yield(GetEasterFor(year))
    }
}

fun PrintEasters(easters: Sequence<LocalDate>) {
    println("Easters:")
    var formatter = DateTimeFormatter.ofPattern("   dd MMMM, yyyy")
    for (easter in easters) {
        println(easter.format(formatter))
    }
}

fun main(args: Array<String>) {
    PrintEasters(GetEasters(1950, 2050))
}
