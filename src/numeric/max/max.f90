program MaxValues
    implicit none

    integer, allocatable, dimension(:) :: list
    integer :: stat, maxValue, i, num_args
    character(len=100) :: buffer

    num_args = command_argument_count()
    if (num_args > 0) then
        allocate(list(1:num_args), stat=stat)
        do i = 1, num_args
            call get_command_argument(i, buffer)
            read(buffer, *) list(i)
        end do
    else
        allocate(list(1:2), stat=stat)
        list(1) = 15
        list(2) = 10
    end if

    maxValue = max_list(list)
    print *, "values:"
    print *, (list(i), i = 1, size(list))
    print '("max: ", I0)', maxValue

    deallocate(list, stat=stat)

contains

    function max_list(array) result(maxValue)
        integer, dimension(:), intent(in) :: array
        integer :: maxValue, index

        maxValue = 0
        do index = 1, size(array)
            if (array(index) > maxValue) then
                maxValue = array(index)
            end if
        end do
    end function
end program MaxValues
