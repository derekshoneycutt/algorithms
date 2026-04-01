# Calculates the GCD of two values and prints it all to the screen

# Calculate the GCD using Euclid's algorithm
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
# attempt to parse the command line arguments or default to 15, 10
args <- commandArgs(trailingOnly = TRUE)
if (length(args) >= 2) {
  m <- as.integer(args[1])
  n <- as.integer(args[2])
}

sprintf("%d %d", m, n)
sprintf("gcd: %d", euclidgcd(m, n))
