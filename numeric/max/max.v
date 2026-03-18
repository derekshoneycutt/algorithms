import os

fn max(values []int) int {
	mut current := 0
	for value in values {
		if value > current {
			current = value
		}
	}
	return current
}

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

	maximum := max(values)

	println('values: $values')
	println('max: $maximum')
}
