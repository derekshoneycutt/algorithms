       IDENTIFICATION DIVISION.
       PROGRAM-ID. MAIN.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 ARG-RAW PIC X(10).
         01 ARG-NUM PIC 9.
         01 M PIC 9(4) VALUE 15.
         01 N PIC 9(4) VALUE 10.

         01 M_OUT PIC Z(1)9.
         01 N_OUT PIC Z(1)9.
         01 GCD_OUT PIC Z(1)9.

       PROCEDURE DIVISION.
           ACCEPT ARG-NUM FROM ARGUMENT-NUMBER.
           IF ARG-NUM >= 2
             ACCEPT ARG-RAW FROM ARGUMENT-VALUE
             COMPUTE M_OUT = FUNCTION NUMVAL(ARG-RAW)
             MOVE M_OUT TO M
             ACCEPT ARG-RAW FROM ARGUMENT-VALUE
             COMPUTE N_OUT = FUNCTION NUMVAL(ARG-RAW)
             MOVE N_OUT TO N
           ELSE
             MOVE FUNCTION TRIM(M) TO M_OUT
             MOVE FUNCTION TRIM(N) TO N_OUT
           END-IF
           
           CALL 'EUCLIDGCD' USING M, N.
           MOVE FUNCTION TRIM(M) TO GCD_OUT.
           DISPLAY M_OUT ' ' N_OUT.
           DISPLAY 'gcd:' GCD_OUT.
           STOP RUN.

       END PROGRAM MAIN.

       IDENTIFICATION DIVISION.
       PROGRAM-ID. EUCLIDGCD.

       DATA DIVISION.
         WORKING-STORAGE SECTION.
         01 D PIC 9(4).
         01 R PIC 9(4).
         LINKAGE SECTION.
         01 M PIC 9(4).
         01 N PIC 9(4).

       PROCEDURE DIVISION USING M, N.
           PERFORM LOOP UNTIL N <= 0.
           EXIT PROGRAM.

         LOOP.
           DIVIDE M BY N GIVING D REMAINDER R.
           MOVE N TO M.
           MOVE R TO N.

       END PROGRAM EUCLIDGCD.
