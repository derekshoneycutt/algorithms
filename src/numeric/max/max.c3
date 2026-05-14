/*
	Finds the single maximum value from a set of values
*/

import std::io;
import std::collections;

// Get the max value from a list of values
fn Type max(List {Type} values) <Type> {
	Type curr = values[0];
	for (int i = 1; i < values.len(); ++i) {
		if (values[i] > curr) {
			curr = values[i];
		}
	}
	return curr;
}

// The main entry point to the application
fn void main(String[] args)
{
	List {int} values;
	values.init(mem);

	if (args.len > 1) {
		for (int i = 1; i < args.len; ++i) {
			values.push(args[i].to_int() ?? 0);
		}
	}
	else {
		values.push(15);
		values.push(10);
	}

	foreach (i, item : values) {
		io::printf("%d ", item);
	}
    io::printfn("\nmax: %d", max{int}(values));

	values.free();
}
