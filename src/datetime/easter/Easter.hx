
// Custom Iterator that loops through the desired years
// and returns easter for each one. Basic generator.
// Constructor always requires start and end years.
class EasterGenerator {
    var currYear: Int;
    var endYear: Int;

    public function new(startYear: Int, endAt: Int) {
        endYear = endAt;
        currYear = startYear - 1;
    }

    // this is the actual algorithm from knuth; the rest I made up
    static function getEasterFor(year: Int): Date {
        var g: Int = (year % 19) + 1;
        var c: Int = Std.int(year / 100) + 1;
        var x: Int = Std.int(3 * c / 4) - 12;
        var z: Int = Std.int(((8 * c) + 5) / 25) - 5;
        var d: Int = Std.int(5 * year / 4) - x - 10;
        var e: Int = ((11 * g) + 20 + z - x) % 30;
        if (((e == 25) && (g > 11)) || (e == 24)) {
            ++e;
        }
        var n: Int = 44 - e;
        if (n < 21) {
            n += 30;
        }
        n += 7 - ((d + n) % 7);

        if (n > 31) {
            return new Date(year, 3, n - 31, 0, 0, 0);
        }
        return new Date(year, 2, n, 0, 0, 0);
    }

    // Required iterator section for Haxe
    public function hasNext() {
        var nextYear = currYear + 1;
        return (nextYear <= endYear);
    }

    public function next() {
        currYear = currYear + 1;
        return getEasterFor(currYear);
    }
}

// Continue the ordinary pattern of a main class that operates it all
class Easter {

    // it's shorter this way in printEasters; easier to read; just pad 00
    static function pad(prime: Int): String {
        return StringTools.lpad(Std.string(prime), "0", 2);
    }

    static function printEasters(easters: EasterGenerator): Void {
        Sys.println('Easters:');
        for (easter in easters) {
            Sys.println('   ${DateTools.format(easter, "%d %B %Y")}');
        }
    }

    static public function main() : Void {
        printEasters(new EasterGenerator(1950,2050));
    }
}
