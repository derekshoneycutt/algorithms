program primes
    implicit none

    integer :: list_primes(500)
    integer :: counter

    list_primes = get_primes()
    print *, "First Five Hundred Primes"
    do counter = 1, 50
        print '("     ", *(1x,i4.4))', &
            & list_primes(counter), list_primes(50 + counter), list_primes(100 + counter), &
            & list_primes(150 + counter), list_primes(200 + counter), list_primes(250 + counter), &
            & list_primes(300 + counter), list_primes(350 + counter), list_primes(400 + counter), &
            & list_primes(450 + counter)
    end do

contains

    function get_primes() result(list_primes)
        integer :: list_primes(500)
        integer :: n, j, k, q, r, t
        logical :: is_prime 

        list_primes(1) = 2
        n = 3
        j = 1

        do while (j <= 500)
            j = j + 1
            list_primes(j) = n
            
            is_prime = .false.
            do while (is_prime .eqv. .false.)
                n = n + 2

                k = 2
                q = 9999
                r = 1
                t = 0
                do while (r /= 0 .and. q > t)
                    t = list_primes(k)
                    q = n / t
                    r = mod(n, t)

                    k = k + 1
                end do

                if (r /= 0 .and. q <= t) then
                    is_prime = .true.
                end if
            end do
        end do
    end function
end program