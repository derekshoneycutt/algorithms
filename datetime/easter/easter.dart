
DateTime get_easter_for(int year) {
    int g = (year % 19) + 1;
    int c = (year ~/ 100) + 1;
    int x = (3 * c ~/ 4) - 12;
    int z = (((8 * c) + 5) ~/ 25) - 5;
    int d = (5 * year ~/ 4) - x - 10;
    int e = ((11 * g) + 20 + z - x) % 30;
    if (((e == 25) && (g > 11)) || (e == 24))
    {
        ++e;
    }
    int n = 44 - e;
    if (n < 21)
    {
        n += 30;
    }
    n += 7 - ((d + n) % 7);

    return DateTime(year, (n > 31) ? 4 : 3, (n > 31) ? n - 31 : n);
}

Iterable<DateTime> get_easters(int startYear, int endYear) sync* {
  for (int year = startYear; year <= endYear; ++year) {
    yield get_easter_for(year);
  }
}

void print_easters(Iterable<DateTime> easters) {
  print("Easters:");
  for (DateTime easter in easters) {
    String month = "March";
    if (easter.month == 4) {
      month = "April";
    }
    print("   ${easter.day.toString().padLeft(2, '0')} ${month} ${easter.year.toString()}");
  }
}

void main(List<String> arguments) {
  print_easters(get_easters(1950, 2050));
}
