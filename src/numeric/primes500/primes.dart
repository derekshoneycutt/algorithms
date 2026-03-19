
Iterable<int> prime_sieve() sync* {
  yield 2;
  List<int> cache = [];
  int candidate = 3;
  while (true) {
    if (cache.every((prime) => candidate % prime != 0)) {
      yield candidate;
      cache.add(candidate);
    }

    candidate += 2;
  }
}

List<int> get_primes(int count) {
  return prime_sieve().take(count).toList();
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
  print_primes(get_primes(500));
}
