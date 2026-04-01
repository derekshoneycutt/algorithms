package main
/*
	Calculate the GCD between two values and print it all to the screen
*/

import (
	"fmt"
	"os"
	"strconv"
)

// Calculate the GCD between m and n using Euclid's method
func euclidgcd(m int, n int) int {
	var r int
	for n != 0 {
		r = m % n
		m = n
		n = r
	}
	return m
}

// The main entry point of the application
func main() {
	var m int = 15
	var n int = 10
	var err error

	if len(os.Args) >= 3 {
		m, err = strconv.Atoi(os.Args[1])
		n, err = strconv.Atoi(os.Args[2])
	}

	if err != nil {
		// this is mostly a formality in this code, but
		// informative if something went bad.
		fmt.Println("An error happened")
	}

	fmt.Println(m, " ", n)
	fmt.Println("gcd: ", euclidgcd(m, n))
}
