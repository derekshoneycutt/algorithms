package main

import "fmt"

func set_primes(primes []int) {
	var n int = 3
	primes[0] = 2

	for j := 1; j < 500; j++ {
		primes[j] = n

		var is_prime bool = false
		for !is_prime {
			n += 2

			var q int = 9999
			var r int = 1
			var t int = 0
			for k := 1; (r != 0) && (q > t); k++ {
				t = primes[k]
				q = n / t
				r = n % t
			}

			is_prime = (r != 0) && (q <= t)
		}
	}
}

func print_primes(primes []int) {
	fmt.Println("First Five Hundred Primes")
	for i := 0; i < 50; i++ {
		fmt.Printf("     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d\n",
			primes[i], primes[50+i], primes[100+i], primes[150+i],
			primes[200+i], primes[250+i], primes[300+i],
			primes[350+i], primes[400+i], primes[450+i])
	}
}

func main() {
	var primes []int = make([]int, 500)

	set_primes(primes)
	print_primes(primes)
}
