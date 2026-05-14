/*
	Calculates the greatest common denominator for 2 values
*/
import std::io;

// Calculate the GCD of two integer values
fn int euclidgcd(int m, int n) {
	int r = 0;
	while (n != 0) {
		r = m % n;
		m = n;
		
		n = r;
	}
	return m;
}

// The main entry point to the application
fn void main(String[] args)
{
	int m = 15;
	int n = 10;

	if (args.len > 2) {
		m = args[1].to_int() ?? 15;
		n = args[2].to_int() ?? 10;
	}

    io::printfn("%d %d\ngcd: %d", m, n, euclidgcd(m, n));
}
