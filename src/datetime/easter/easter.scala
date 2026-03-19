import scala.annotation.tailrec
import scala.collection.immutable.LazyList
import java.time.LocalDate
import java.time.format.DateTimeFormatter

def get_easter_for(y: Int): LocalDate =
    val g = y % 19 + 1
    val c = y / 100 + 1
    val x = 3 * c / 4 - 12
    val z = (8 * c + 5) / 25 - 5
    val d = 5 * y / 4 - x - 10
    var e = (11 * g + 20 + z - x) % 30
    if (e == 25 && g > 11 || e == 24) {
        e += 1
    }
    var n = 44 - e
    if (n < 21) {
        n += 30
    }
    n += 7 - (d + n) % 7
    if (n > 31) {
        LocalDate.of(y, 4, n - 31)
    } else {
        LocalDate.of(y, 3, n)
    }

def get_easters(year: Int, maxYear: Int): LazyList[LocalDate] =
    if (year > maxYear) { LazyList.empty[LocalDate] }
    else { get_easter_for(year) #:: get_easters(year + 1, maxYear) }

@tailrec
def print_easters(easters: LazyList[LocalDate]): Unit =
    easters match {
        case LazyList() => ()
        case head #:: tail =>
            val formatter = DateTimeFormatter.ofPattern("   dd MMMM, yyyy")
            println(head.format(formatter))
            print_easters(tail)
    }

@main
def main(args: String*): Unit =
    println("Easters:")
    print_easters(get_easters(1950, 2050))
