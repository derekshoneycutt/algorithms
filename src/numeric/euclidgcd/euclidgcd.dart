
int euclidgcd(int m, int n) {
    int r = 0;
    while (n != 0) {
        r = m % n;
        m = n;
        n = r;
    }
    return m;
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
