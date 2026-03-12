library(coro)

get_easter_for <- function(year) {
  g <- (year %% 19) + 1
  c <- floor(year / 100) + 1
  x <- floor(3 * c / 4) - 12
  z <- floor(((8 * c) + 5) / 25) - 5
  d <- floor(5 * year / 4) - x - 10
  e <- ((11 * g) + 20 + z - x) %% 30
  if ((e == 25 && g > 11) || e == 24) {
    e <- e + 1
  }
  n <- 44 - e
  if (n < 21) {
    n <- n + 30
  }
  n <- n + 7 - ((d + n) %% 7)

  if (n > 31) {
    ISOdate(year, month = 4, day = n - 31)
  } else {
    ISOdate(year, month = 3, day = n)
  }
}

generate_easters <- generator(function(start_year, end_year) {
  for (year in start_year:end_year) {
    yield(get_easter_for(year))
  }
})

print_easters <- function(easters) {
  print("Easters:")
  loop(for (easter in easters) {
    print(format(easter, format = "   %d %B, %Y"))
  })
}

print_easters(generate_easters(1950, 2050))
