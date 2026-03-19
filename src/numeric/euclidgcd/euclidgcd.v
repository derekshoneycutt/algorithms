import os

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

fn main() {
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
