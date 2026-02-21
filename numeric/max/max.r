
library(purrr)

max_list <- function(list) {
  current <- 0
  for (value in list) {
    if (value > current) {
      current <- value
    }
  }
  current
}

uselist <- list(15, 10)
args <- commandArgs(trailingOnly = TRUE)
if (length(args) > 0) {
  uselist <- as.list(map(args, \(arg) as.integer(arg)))
}

max_value <- max_list(uselist)

sprintf("values: %s", paste(uselist, collapse = ", "))
sprintf("max: %d", max_value)
