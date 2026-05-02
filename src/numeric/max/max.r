# This program gets the maximum value of a sequence of values

# Finds the maximum value in a list of numbers.
# 
# Parameters
# ----------
# list
#     The list to find the maximum value from
#
# Returns
# ---------
#     The maximum value of the list
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
  uselist <- as.list(as.integer(args))
}

max_value <- max_list(uselist)

sprintf("values: %s", paste(uselist, collapse = ", "))
sprintf("max: %d", max_value)
