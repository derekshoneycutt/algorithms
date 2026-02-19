package main

import (
	"fmt"
	"os"
	"strconv"
)

func euclidgcd(m int, n int) int {
	var r int
	for n != 0 {
		r = m % n
		m = n
		n = r
	}
	return m
}

func main() {
	var m int = 15
	var n int = 10
	var err error

	if len(os.Args) >= 3 {
		m, err = strconv.Atoi(os.Args[1])
		n, err = strconv.Atoi(os.Args[2])
	}

	if err != nil {
		fmt.Println("An error happened")
	}

	fmt.Println(m, " ", n)
	fmt.Println("gcd: ", euclidgcd(m, n))
}
