/*
	Calculates the GCD of two values and prints it all to the screen
 */
import os

// Calculates the GCD with Euclid's algorithm
fn euclidgcd(m_in int, n_in int) int {
	mut r := 0
	mut m := m_in
	mut n := n_in
	for n != 0 {
		r = m % n
		m = n
		n = r
	}
	return m
}

// The main entry point to the application
fn main() {
	// Attempt the first 2 command line parameters, or use 15, 10
	mut m := 15
	mut n := 10
	if os.args.len > 2 {
		m = os.args[1].int()
		n = os.args[2].int()
	}

	gcd := euclidgcd(m, n);

    println('$m $n')
	println('gcd: $gcd')
}
