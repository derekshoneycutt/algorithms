
class Easter {

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

    static function getEasters(startYear: Int, endYear: Int): List<Date> {
        var easters = new List<Date>();

        for (year in startYear...endYear) {
            easters.add(getEasterFor(year));
        }

        return easters;
    }

    static function pad(prime: Int): String {
        return StringTools.lpad(Std.string(prime), "0", 2);
    }

    static function printEasters(easters: List<Date>): Void {
        Sys.println('Easters:');
        for (easter in easters) {
            Sys.println('   ${DateTools.format(easter, "%d %B %Y")}');
        }
    }

    static public function main() : Void {
        printEasters(getEasters(1950,2050));
    }
}
