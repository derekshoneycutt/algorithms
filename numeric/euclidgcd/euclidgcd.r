
euclidgcd <- function(m, n) {
  r <- m %% n
  while (r != 0) {
    m <- n
    n <- r
    r <- m %% n
  }
  n
}

v_1 <- 15
v_2 <- 10

args <- commandArgs(trailingOnly = TRUE)
if (length(args) >= 2) {
  v_1 <- as.integer(args[1])
  v_2 <- as.integer(args[2])
}

sprintf("%d %d", v_1, v_2)
sprintf("%d", euclidgcd(v_1, v_2))
