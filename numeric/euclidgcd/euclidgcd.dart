
int euclidgcd(int m, int n) {

    int r = m % n;
    while (r != 0) {
        m = n;
        n = r;
        r = m % n;
    }
    return n;
}

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
