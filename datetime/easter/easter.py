import datetime

def get_easter_for(year):
    g = (year % 19) + 1
    c = (year // 100) + 1
    x = (3 * c // 4) - 12
    z = (((8 * c) + 5) // 25) - 5
    d = (5 * year // 4) - x - 10
    e = ((11 * g) + 20 + z - x) % 30
    if ((e == 25 and g > 11) or e == 24):
        e += 1
    n = 44 - e
    if n < 21:
        n += 30
    n += 7 - ((d + n) % 7)

    if n > 31:
        return datetime.datetime(year, 4, n - 31)
    return datetime.datetime(year, 3, n)

def generate_easters(start_year, end_year):
    for year in range(start_year, end_year + 1):
        yield get_easter_for(year)

def print_easters(easters):
    print("Easters:")
    for easter in easters:
        print(easter.strftime("   %d %B, %Y"))

print_easters(generate_easters(1950, 2050))
