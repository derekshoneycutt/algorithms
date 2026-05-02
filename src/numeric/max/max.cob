      *    Get the maximum value of a sequence of integers
       IDENTIFICATION DIVISION.
       PROGRAM-ID. MAIN.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
      /    The values from the command line; or 15, 10 default
         01 ARG-RAW PIC X(10).
         01 ARG-NUM PIC 9.

      /    The array and its size used to store the integer values
         01 ARRAY-SIZE PIC 9(4) VALUE 0.
         01 ARRAY-PTR USAGE POINTER.

      /    The values used to iterate and store the max value
         01 N PIC 9(4) VALUE 0.
         01 MAXVALUE PIC 9(4) VALUE 0.
         01 OUTVALUE PIC Z(1)9.

         LINKAGE SECTION.
      /    The array as will be passed to the MAXVALUE program
         01 INTEGER-ARRAY BASED.
           05 INTEGER-ITEM PIC 9(4) OCCURS 1 TO 100 TIMES
                                   DEPENDING ON ARRAY-SIZE.

       PROCEDURE DIVISION.
      /    First, we get the command line arguments by allocating an
      /      array; default to 15 10 if no arguments given
           ACCEPT ARG-NUM FROM ARGUMENT-NUMBER.
           IF ARG-NUM >= 1
             MOVE ARG-NUM TO ARRAY-SIZE
             ALLOCATE INTEGER-ARRAY INITIALIZED RETURNING ARRAY-PTR
             SET ADDRESS OF INTEGER-ARRAY TO ARRAY-PTR

             PERFORM VARYING N FROM 1 BY 1 UNTIL N > ARG-NUM
               ACCEPT ARG-RAW FROM ARGUMENT-VALUE
               MOVE FUNCTION NUMVAL(ARG-RAW) TO INTEGER-ITEM(N)
             END-PERFORM
           ELSE
             MOVE 2 TO ARRAY-SIZE
             ALLOCATE INTEGER-ARRAY INITIALIZED RETURNING ARRAY-PTR
             SET ADDRESS OF INTEGER-ARRAY TO ARRAY-PTR

             MOVE 15 TO INTEGER-ITEM(1)
             MOVE 10 TO INTEGER-ITEM(2)
           END-IF

      /    When we have the values, call MAXVALUE and print it all out
           CALL 'MAXVALUE' USING ARRAY-PTR, ARRAY-SIZE, MAXVALUE.

           DISPLAY "values:"
           PERFORM VARYING N FROM 1 BY 1 UNTIL N > ARRAY-SIZE
             MOVE FUNCTION TRIM(INTEGER-ITEM(N)) TO OUTVALUE
             DISPLAY OUTVALUE
           END-PERFORM.

           MOVE FUNCTION TRIM(MAXVALUE) TO OUTVALUE.
           DISPLAY 'max:' OUTVALUE.

           FREE ARRAY-PTR.
           SET ARRAY-PTR TO NULL.
           STOP RUN.

       END PROGRAM MAIN.

      *    Gets the maximum of an array of values
       IDENTIFICATION DIVISION.
       PROGRAM-ID. MAXVALUE.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 COUNTER PIC 9(4).
         LINKAGE SECTION.
      /    The array and resulting max value to work with the caller
         01 FINALVALUE PIC 9(4).
         01 ARRAY-PTR USAGE POINTER.
         01 ARRAY-SIZE PIC 9(4).

         01 INTEGER-ARRAY BASED.
           05 INTEGER-ITEM PIC 9(4) OCCURS 1 TO 100 TIMES
                                   DEPENDING ON ARRAY-SIZE.

       PROCEDURE DIVISION USING ARRAY-PTR, ARRAY-SIZE, FINALVALUE.
           SET ADDRESS OF INTEGER-ARRAY TO ARRAY-PTR.
           
           MOVE 0 to FINALVALUE.
           PERFORM VARYING COUNTER FROM 1 BY 1
                                   UNTIL COUNTER > ARRAY-SIZE
               IF INTEGER-ITEM(COUNTER) > FINALVALUE THEN
                   MOVE INTEGER-ITEM(COUNTER) TO FINALVALUE
               END-IF
           END-PERFORM.

           EXIT PROGRAM.

       END PROGRAM MAXVALUE.
