/***********************************************
 *  Calculate the GCD of two values and print it all to the screen
 */

/// Calculate the GCD for two values with Euclid's algorithm.
/// 
/// # Arguments
/// * `m_in` - The first value to calculate the GCD for.
/// * `n_in` - The second value to calculate the GCD for.
/// 
/// # Returns
/// The calculated GCD of the two values.
fn euclidgcd(m_in: i64, n_in: i64) -> i64 {
    let mut m = m_in;
    let mut n = n_in;
    let mut r;
    while n != 0 {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

/// The main entry point to the application
fn main() {
    let args: Vec<_> = std::env::args().collect();

    let m = if args.len() >= 3 {
         args[1].parse().expect("Bad value in input 1.") }
         else { 15 };
    let n = if args.len() >= 3 {
         args[2].parse().expect("Bad value in input 2.") }
         else { 10 };

    println!("{} {}", m, n);
    println!("gcd: {}", euclidgcd(m, n));
}
