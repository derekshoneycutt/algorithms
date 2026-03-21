from std.iter import Iterator, Iterable

# We start with a copyable Date struct that has a decent print method
struct Date(Copyable):
    var day: Int
    var month: String
    var year: Int

    # looks like we have to pad the day value manually
    def _pad_day(self, n: Int) -> String:
        var unpadded = String(t"{n}")
        var padded = ""
        if len(unpadded) < 4:
            for _ in range(2 - len(unpadded)):
                padded += "0"
        padded += unpadded
        return padded
    
    def __init__(out self, d: Int, m: String, y: Int):
        self.day = d
        self.month = m
        self.year = y

    def __init__(out self, *, copy: Self):
        self.day = copy.day
        self.month = copy.month
        self.year = copy.year

    def print(self):
        print(t"   {self._pad_day(self.day)} {self.month}, {self.year}")

# We use a struct setup as a basic state machine to generate the
# easters for now. This looks like mojo being early in development still
# that iterators, etc. are a little difficult to implement.
struct EasterGenerator:
    var currYear: Int
    var endYear: Int

    def _get_easter_for(self, year: Int) -> Date:
        var g = (year % 19) + 1
        var c: Int = (year / 100) + 1
        var x: Int = (3 * c / 4) - 12
        var z: Int = (((8 * c) + 5) / 25) - 5
        var d: Int = (5 * year / 4) - x - 10
        var e: Int = ((11 * g) + 20 + z - x) % 30
        if ((e == 25) & (g > 11)) | (e == 24):
            e = e + 1
        var n = 44 - e
        if n < 21:
            n = n + 30
        n = n + 7 - ((d + n) % 7)
        if n > 31:
            return Date(n - 31, "April", year)
        return Date(n, "March", year)

    fn __init__(out self, start: Int, end: Int):
        self.currYear = start - 1
        self.endYear = end

    fn has_next(self) -> Bool:
        return self.currYear < self.endYear

    fn next(mut self) raises StopIteration -> Date:
        self.currYear += 1
        if self.currYear <= self.endYear:
            return self._get_easter_for(self.currYear)
        raise StopIteration()

# Printing is easy at least
def print_easters(mut easters: EasterGenerator):
    print("Easters")
    while easters.has_next():
        try:
            easters.next().print()
        except:
            return

# Interestingly, because the state machine needs to mutate itself,
# we need to create a mutable instance and then send it print_easters
def main() raises:
    var easters = EasterGenerator(1950, 2050)
    print_easters(easters)
