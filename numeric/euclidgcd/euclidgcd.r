
euclidgcd <- function(m, n) {
  while (n != 0) {
    r <- m %% n
    m <- n
    n <- r
  }
  m
}

m <- 15
n <- 10

args <- commandArgs(trailingOnly = TRUE)
if (length(args) >= 2) {
  m <- as.integer(args[1])
  n <- as.integer(args[2])
}

sprintf("%d %d", m, n)
sprintf("gcd: %d", euclidgcd(m, n))
