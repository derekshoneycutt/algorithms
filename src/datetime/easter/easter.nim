import std/times

proc getEasterFor(year: int): DateTime =
    var g = (year mod 19) + 1
    var c: int = (year div 100) + 1
    var x: int = (3 * c div 4) - 12
    var z: int = (((8 * c) + 5) div 25) - 5
    var d: int = (5 * year div 4) - x - 10
    var e = ((11 * g) + 20 + z - x) mod 30
    if ((e == 25) and (g > 11)) or (e == 24):
        e += 1
    var n = 44 - e
    if n < 21:
        n += 30
    n += 7 - ((d + n) mod 7)
    if n > 31:
        return dateTime(year, mApr, n - 31)
    return dateTime(year, mMar, n)

iterator getEasters(startYear: int, endYear: int): DateTime =
    for year in startYear..endYear:
        yield getEasterFor(year)

echo "Easters:"
for easter in getEasters(1950, 2050):
    echo easter.format("   dd MMMM, yyyy")
