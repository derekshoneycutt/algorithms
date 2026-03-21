from std.collections.list import List

def pad_day(n: Int) -> String:
    var unpadded = String(t"{n}")
    var padded = ""
    if len(unpadded) < 4:
        for _ in range(2 - len(unpadded)):
            padded += "0"
    padded += unpadded
    return padded

struct Date(Copyable):
    var day: Int
    var month: String
    var year: Int

    def __init__(out self, d: Int, m: String, y: Int):
        self.day = d
        self.month = m
        self.year = y

    def __init__(out self, *, copy: Self):
        self.day = copy.day
        self.month = copy.month
        self.year = copy.year

    def print(self):
        print(t"   {pad_day(self.day)} {self.month}, {self.year}")

def get_easter_for(year: Int) raises -> Date:
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

def get_easters(start: Int, end: Int) raises -> List[Date]:
    var easters = List[Date]()
    var current = start
    while current < end:
        easters.append(get_easter_for(current))
        current = current + 1
    return easters^

def print_easters(easters: List[Date]):
    print("Easters")
    for easter in easters:
        easter.print()

def main() raises:
    print_easters(get_easters(1950, 2050))
