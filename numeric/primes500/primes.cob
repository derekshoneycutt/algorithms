       IDENTIFICATION DIVISION.
       PROGRAM-ID. MAIN.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 COUNTER PIC 9(4).

         01 PRIME-TABLE.
           05 PRIME-ROW OCCURS 50 TIMES.
             10 PRIME-VALUE PIC 9(4) OCCURS 10 TIMES.

       PROCEDURE DIVISION.
           CALL 'PRIMES' USING PRIME-TABLE.

           DISPLAY "First Five Hundred Primes".
           PERFORM VARYING COUNTER FROM 1 BY 1 UNTIL COUNTER > 50
               DISPLAY "    " PRIME-VALUE(COUNTER, 1)
                          " " PRIME-VALUE(COUNTER, 2)
                          " " PRIME-VALUE(COUNTER, 3)
                          " " PRIME-VALUE(COUNTER, 4)
                          " " PRIME-VALUE(COUNTER, 5)
                          " " PRIME-VALUE(COUNTER, 6)
                          " " PRIME-VALUE(COUNTER, 7)
                          " " PRIME-VALUE(COUNTER, 8)
                          " " PRIME-VALUE(COUNTER, 9)
                          " " PRIME-VALUE(COUNTER, 10)
           END-PERFORM.

           STOP RUN.

       END PROGRAM MAIN.

       IDENTIFICATION DIVISION.
       PROGRAM-ID. PRIMES.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 COUNTER PIC 9(4) VALUE 0.
         01 CANDIDATE PIC 9(4) VALUE 3.
         01 POS-COL PIC 9(4) VALUE 1.
         01 POS-ROW PIC 9(4) VALUE 1.
         01 TEST-PRIME PIC 9(4).
         01 TEST-PRIME-VALUE PIC 9(4).
         01 PRIME-QUOT PIC 9(4).
         01 PRIME-REM PIC 9(4).

         01 IS-PRIME PIC X.
           88 IS-PRIME-TRUE VALUE 'T'.
           88 IS-PRIME-FALSE VALUE 'F'.

         LINKAGE SECTION.
         01 PRIME-TABLE.
           05 PRIME-ROW OCCURS 50 TIMES.
             10 PRIME-VALUE PIC 9(4) OCCURS 10 TIMES.

       PROCEDURE DIVISION USING PRIME-TABLE.
           MOVE 2 TO PRIME-VALUE(1,1).
           
           PERFORM UNTIL COUNTER >= 499
               ADD 1 TO COUNTER
               DIVIDE COUNTER BY 50 GIVING POS-COL REMAINDER POS-ROW
               ADD 1 TO POS-COL
               ADD 1 TO POS-ROW

               MOVE CANDIDATE TO PRIME-VALUE(POS-ROW, POS-COL)

               SET IS-PRIME-FALSE TO TRUE
               PERFORM UNTIL IS-PRIME-TRUE
                   ADD 2 TO CANDIDATE
                   MOVE 1 TO TEST-PRIME
                   
                   MOVE 0 TO TEST-PRIME-VALUE
                   MOVE 1 TO PRIME-REM
                   MOVE 9999 TO PRIME-QUOT
                   PERFORM UNTIL PRIME-REM = 0
                                 OR PRIME-QUOT <= TEST-PRIME-VALUE
                       DIVIDE TEST-PRIME BY 50 GIVING POS-COL
                                               REMAINDER POS-ROW
                       ADD 1 TO POS-COL
                       ADD 1 TO POS-ROW
                       MOVE PRIME-VALUE(POS-ROW, POS-COL)
                               TO TEST-PRIME-VALUE

                       DIVIDE CANDIDATE BY TEST-PRIME-VALUE
                           GIVING PRIME-QUOT REMAINDER PRIME-REM

                       ADD 1 TO TEST-PRIME
                   END-PERFORM

                   IF PRIME-REM <> 0
                       AND PRIME-QUOT <= TEST-PRIME-VALUE THEN
                       SET IS-PRIME-TRUE TO TRUE
                   END-IF
               END-PERFORM
           END-PERFORM.

           EXIT PROGRAM.

       END PROGRAM PRIMES.
