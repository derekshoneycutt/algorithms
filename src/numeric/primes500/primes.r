
get_primes <- function() {
  primes <- list(2)
  n <- 3

  for (j in 1:500) {
    primes <- append(primes, n)

    is_prime <- FALSE
    while (!is_prime) {
      n <- n + 2

      q <- 9999
      r <- 1
      t <- 0
      k <- 2
      while ((r != 0) && (q > t)) {
        t <- primes[[k]]
        q <- n / t
        r <- n %% t
        k <- k + 1
      }
      is_prime <- (r != 0) && (q <= t)
    }
  }
  primes
}

print_primes <- function(primes) {
  print("First Five Hundred Primes")
  for (i in 1:50) {
    print(sprintf("     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d",
                  primes[[i]], primes[[50 + i]], primes[[100 + i]],
                  primes[[150 + i]], primes[[200 + i]], primes[[250 + i]],
                  primes[[300 + i]], primes[[350 + i]], primes[[400 + i]],
                  primes[[450 + i]]))
  }
}

print_primes(get_primes())
