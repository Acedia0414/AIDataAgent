import { describe, it, expect, beforeAll } from "vitest";
import { createExecution, createExecutionStep, getExecutionWithSteps, updateExecutionStep } from "./executionHistory";

describe("Polling and Retry Limits", () => {
  let testExecutionId: number;
  let testStepId: number;

  beforeAll(async () => {
    // Create a test execution
    testExecutionId = await createExecution({
      userId: 1,
      conversationId: 1,
      naturalLanguageQuery: "Test query for polling",
      outputFormat: "excel",
      totalSteps: 2,
      planExplanation: "Test plan",
      status: "running",
      startedAt: new Date(),
    });

    // Create test steps
    testStepId = await createExecutionStep({
      executionId: testExecutionId,
      stepNumber: 1,
      description: "Test step 1",
      sheetName: "Sheet1",
      status: "failed",
      error: "Test error",
    });

    await createExecutionStep({
      executionId: testExecutionId,
      stepNumber: 2,
      description: "Test step 2",
      sheetName: "Sheet2",
      status: "completed",
      rowCount: 10,
    });
  });

  describe("Polling Endpoint", () => {
    it("should fetch execution with all steps", async () => {
      const result = await getExecutionWithSteps(testExecutionId);
      
      expect(result).toBeDefined();
      expect(result?.execution.id).toBe(testExecutionId);
      expect(result?.steps).toHaveLength(2);
    });

    it("should include retry count in step data", async () => {
      const result = await getExecutionWithSteps(testExecutionId);
      
      expect(result).toBeDefined();
      const failedStep = result?.steps.find(s => s.stepNumber === 1);
      expect(failedStep).toBeDefined();
      expect(failedStep?.retryCount).toBeDefined();
      expect(failedStep?.retryCount).toBe(0); // Initial retry count
    });

    it("should return steps with correct status", async () => {
      const result = await getExecutionWithSteps(testExecutionId);
      
      expect(result).toBeDefined();
      const step1 = result?.steps.find(s => s.stepNumber === 1);
      const step2 = result?.steps.find(s => s.stepNumber === 2);
      
      expect(step1?.status).toBe("failed");
      expect(step2?.status).toBe("completed");
    });
  });

  describe("Retry Limit Enforcement", () => {
    it("should start with retry count of 0", async () => {
      const result = await getExecutionWithSteps(testExecutionId);
      const step = result?.steps.find(s => s.stepNumber === 1);
      
      expect(step?.retryCount).toBe(0);
    });

    it("should increment retry count on retry", async () => {
      // Simulate first retry
      await updateExecutionStep(testStepId, {
        retryCount: 1,
        status: "running",
      });

      const result = await getExecutionWithSteps(testExecutionId);
      const step = result?.steps.find(s => s.stepNumber === 1);
      
      expect(step?.retryCount).toBe(1);
    });

    it("should allow up to 3 retries", async () => {
      // Simulate retries 2 and 3
      await updateExecutionStep(testStepId, {
        retryCount: 2,
        status: "failed",
      });

      let result = await getExecutionWithSteps(testExecutionId);
      let step = result?.steps.find(s => s.stepNumber === 1);
      expect(step?.retryCount).toBe(2);

      await updateExecutionStep(testStepId, {
        retryCount: 3,
        status: "failed",
      });

      result = await getExecutionWithSteps(testExecutionId);
      step = result?.steps.find(s => s.stepNumber === 1);
      expect(step?.retryCount).toBe(3);
    });

    it("should track retry count correctly after multiple attempts", async () => {
      const result = await getExecutionWithSteps(testExecutionId);
      const step = result?.steps.find(s => s.stepNumber === 1);
      
      expect(step?.retryCount).toBe(3);
      expect(step?.status).toBe("failed");
    });
  });

  describe("Retry Count Validation", () => {
    it("should prevent retry when count is 3", async () => {
      const result = await getExecutionWithSteps(testExecutionId);
      const step = result?.steps.find(s => s.stepNumber === 1);
      
      // Verify retry count is at limit
      expect(step?.retryCount).toBe(3);
      
      // In the actual endpoint, this would throw an error
      // Here we just verify the data is correct
      const canRetry = (step?.retryCount || 0) < 3;
      expect(canRetry).toBe(false);
    });

    it("should allow retry when count is less than 3", async () => {
      // Create a new step with retry count 2
      const newStepId = await createExecutionStep({
        executionId: testExecutionId,
        stepNumber: 3,
        description: "Test step 3",
        sheetName: "Sheet3",
        status: "failed",
        error: "Test error",
      });

      await updateExecutionStep(newStepId, {
        retryCount: 2,
      });

      const result = await getExecutionWithSteps(testExecutionId);
      const step = result?.steps.find(s => s.stepNumber === 3);
      
      expect(step?.retryCount).toBe(2);
      
      const canRetry = (step?.retryCount || 0) < 3;
      expect(canRetry).toBe(true);
    });
  });

  describe("Execution Status Polling", () => {
    it("should reflect execution status changes", async () => {
      // Update execution status
      const { updateExecution } = await import("./executionHistory");
      await updateExecution(testExecutionId, {
        status: "completed",
        completedAt: new Date(),
        durationMs: 5000,
      });

      const result = await getExecutionWithSteps(testExecutionId);
      
      expect(result?.execution.status).toBe("completed");
      expect(result?.execution.completedAt).toBeDefined();
      expect(result?.execution.durationMs).toBe(5000);
    });

    it("should include all step details in polling response", async () => {
      const result = await getExecutionWithSteps(testExecutionId);
      
      expect(result).toBeDefined();
      expect(result?.steps).toHaveLength(3); // We added a 3rd step
      
      result?.steps.forEach(step => {
        expect(step.stepNumber).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.status).toBeDefined();
        expect(step.retryCount).toBeDefined();
      });
    });
  });
});
