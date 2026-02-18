program EuclidGcdApp
    implicit none

    integer :: m, n, gcd, num_args
    character(len=100) :: buffer

    m = 15
    n = 10

    num_args = command_argument_count()
    if (num_args > 1) then
        call get_command_argument(1, buffer)
        read(buffer, *) m
        call get_command_argument(2, buffer)
        read(buffer, *) n
    end if

    gcd = euclidgcd(m, n)

    print '(I0, " ", I0)', m, n
    print '("gcd: ", I0)', gcd

contains

    function euclidgcd(m_in, n_in) result(gcd)
        integer, intent(in) :: m_in, n_in
        integer :: m, n, gcd

        m = m_in
        n = n_in
        gcd = mod(m, n)
        do while (gcd /= 0)
            m = n
            n = gcd
            gcd = mod(m, n)
        end do
        gcd = n
    end function
end program EuclidGcdApp
