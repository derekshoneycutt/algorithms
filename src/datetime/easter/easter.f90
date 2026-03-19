
program Easters
    implicit none

    type :: Date
        integer :: year, month, day
    end type

    type :: DateLoopState
        type(Date) :: current
        integer :: endYear
    end type

    type(DateLoopState) :: state 
    
    state = init_easters(1950,2050)
    call print_easters(state)
contains

    subroutine print_easters(state)
        type(DateLoopState), intent(inout) :: state
        type(Date) :: currDate
        character(5) :: month

        print *, "Easters:"
        do while (next_easter(state, currDate))
            if (currDate%month == 4) then
                month = 'April'
            else
                month = 'March'
            end if
            print '("   ", (1x,i2), " ", A, ",",(1x,i4))', &
                currDate%day, month, currDate%year
        end do
    end subroutine

    function init_easters(startYear, endYear) result(state)
        integer, intent(in) :: startYear, endYear
        type(DateLoopState) :: state

        state%current%year = startYear - 1
        state%endYear = endYear
    end function

    function next_easter(state, outdate) result(isvalid)
        type(DateLoopState), intent(inout) :: state
        type(Date), intent(out) :: outdate
        logical :: isvalid
        
        if (state%current%year + 1 > state%endYear) then
            isvalid = .false.
        else
            state%current = get_easter_for(state%current%year + 1)
            outdate = state%current
            isvalid = .true.
        end if
    end function

    function get_easter_for(year) result(easter)
        integer, intent(in) :: year
        type(Date) :: easter

        integer :: g, c, x, z, d, e, n

        g = (mod(year, 19)) + 1
        c = (year / 100) + 1
        x = (3 * c / 4) - 12
        z = (((8 * c) + 5) / 25) - 5
        d = (5 * year / 4) - x - 10
        e = mod((11 * g) + 20 + z - x, 30)
        if ((e == 25 .and. g > 11) .or. e == 24) then
            e = e + 1
        end if
        n = 44 - e
        if (n < 21) then
            n = n + 30
        end if
        n = n + 7 - mod((d + n), 7)

        easter%year = year
        if (n > 31) then
            easter%month = 4
            easter%day = n - 31
        else
            easter%month = 3
            easter%day = n
        end if
    end function
end program
