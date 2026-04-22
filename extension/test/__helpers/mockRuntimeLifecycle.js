/**
 * Creates a mock runtime lifecycle object that records calls.
 *
 * @param {string} [processId] Process identifier returned from beginRun.
 * @returns {{runtimeProcessLifecycle: {beginRun: (input: object) => {ok: boolean, ownerKey: string, processId: string, runToken: number}, markCompleted: (input: object) => boolean, markFailed: (input: object) => boolean}, beginCalls: object[], completedCalls: object[], failedCalls: object[]}} Mock lifecycle and call records.
 */
function createMockRuntimeLifecycle(processId) {
  const beginCalls = [];
  const completedCalls = [];
  const failedCalls = [];
  const resolvedProcessId = String(processId || "test-process-id");

  return {
    runtimeProcessLifecycle: {
      beginRun(input) {
        beginCalls.push(input);
        return {
          ok: true,
          ownerKey: String(input.ownerKey || ""),
          processId: resolvedProcessId,
          runToken: 1,
        };
      },
      markCompleted(input) {
        completedCalls.push(input);
        return true;
      },
      markFailed(input) {
        failedCalls.push(input);
        return true;
      },
    },
    beginCalls,
    completedCalls,
    failedCalls,
  };
}

module.exports = {
  createMockRuntimeLifecycle,
};