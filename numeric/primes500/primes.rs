
fn set_primes(primes: &mut [i32]) {
    let mut n: i32 = 3;
    primes[0] = 2;
    
    for j in 1..500 {
        primes[j] = n;

        let mut is_prime = false;
        while !is_prime {
            n = n + 2;

            let mut q = 9999;
            let mut r = 1;
            let mut t = 0;
            let mut k = 1;
            while r != 0 && q > t {
                t = primes[k];
                q = n / t;
                r = n % t;
                k = k + 1;
            }

            is_prime = r != 0 && q <= t;
        }
    }
}


fn print_primes(primes: &[i32]) {
    println!("First Five Hundred Primes");
    for i in 0..50 {
        println!(
            "     {:04} {:04} {:04} {:04} {:04} {:04} {:04} {:04} {:04} {:04}",
            primes[i], primes[50 + i], primes[100 + i], primes[150 + i],
            primes[200 + i], primes[250 + i], primes[300 + i],
            primes[350 + i], primes[400 + i], primes[450 + i]);
    }
}


fn main() {
    let mut primes: [i32; 500] = [0; 500];

    set_primes(&mut primes);
    print_primes(&primes);
}
