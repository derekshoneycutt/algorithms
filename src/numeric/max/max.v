/*
	Get the maximum value of some sequence of values
*/
import os

// Get the maximum value of some list
fn max[T](values []T) ?T {
	if values.len < 1 {
		return none
	}
	mut current := values[0]
	for value in values {
		if value > current {
			current = value
		}
	}
	return current
}

// The main entry point to the application
fn main() {
	mut values := []int{}
	if os.args.len > 1 {
		values << os.args.filter(fn (arg string) bool {
			return arg.is_int()
		}).map(fn (arg string) int {
			return arg.int()
		})
	}
	else {
		values << [15, 10]
	}

	maximum := max(values) or { 0}

	println('values: $values')
	println('max: $maximum')
}
