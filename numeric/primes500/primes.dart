
List<int> get_primes() {
  List<int> primes = [];
  int n = 3;
  primes.add(2);

  for (var j = 1; j < 500; j++) {
    primes.add(n);

    bool is_prime = false;
    while (!is_prime) {
      n += 2;

      int q = 9999;
      int r = 1;
      int t = 0;
      for (var k = 1; (r != 0) && (q > t); ++k) {
        t = primes[k];
        q = n ~/ t;
        r = n % t;
      }

      is_prime = (r != 0) && (q <= t);
    }
  }
  return primes;
}

void print_primes(List<int> primes) {
  print("First Five Hundred Primes\n");
  for (int i = 0; i < 50; ++i)
  {
    print("     ${primes[i].toString().padLeft(4, '0')} "
      + "${primes[50 + i].toString().padLeft(4, '0')} "
      + "${primes[100 + i].toString().padLeft(4, '0')} "
      + "${primes[150 + i].toString().padLeft(4, '0')} "
      + "${primes[200 + i].toString().padLeft(4, '0')} "
      + "${primes[250 + i].toString().padLeft(4, '0')} "
      + "${primes[300 + i].toString().padLeft(4, '0')} "
      + "${primes[350 + i].toString().padLeft(4, '0')} "
      + "${primes[400 + i].toString().padLeft(4, '0')} "
      + "${primes[450 + i].toString().padLeft(4, '0')}");
  }
}

void main(List<String> arguments) {
  print_primes(get_primes());
}
