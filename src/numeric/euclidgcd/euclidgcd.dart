/*
 *  Calculate the GCD for two values and print it all to the screen
 */

/// Calculate the GCD for two given values
/// 
/// The [m] and [n] integers are the two values to calculate the GCD for.
/// 
/// Returns the calculated GCD.
int euclidgcd(int m, int n) {
    int r = 0;
    while (n != 0) {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
}

/// The main entry point to the application
/// 
/// The [arguments] are the command line arguments passed to the application
void main(List<String> arguments) {
  int m = 15;
  int n = 10;

  if (arguments.length >= 2) {
    m = int.parse(arguments[0]);
    n = int.parse(arguments[1]);
  }

  int gcd = euclidgcd(m, n);

  print("${m} ${n}");
  print("gcd: ${gcd}");
}
