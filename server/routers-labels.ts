import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { labelService } from "./labelService";

export const labelsRouter = router({
  // Get all labels
  getAllLabels: publicProcedure.query(async () => {
    const labels = labelService.getAllLabels();
    return Array.from(labels.values());
  }),

  // Get label by ID
  getLabelById: publicProcedure
    .input(z.object({ labelId: z.string() }))
    .query(async ({ input }) => {
      const labelText = labelService.getLabelText(input.labelId);
      if (!labelText) {
        throw new Error(`Label with ID "${input.labelId}" not found`);
      }
      return { labelId: input.labelId, labelText };
    }),

  // Search labels
  searchLabels: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      return labelService.searchLabels(input.query);
    }),

  // Add new label
  addLabel: protectedProcedure
    .input(z.object({
      labelId: z.string().min(1),
      labelText: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await labelService.addLabel(input.labelId, input.labelText, input.description);
      return { success: true, message: "Label added successfully" };
    }),

  // Delete label
  removeLabel: protectedProcedure
    .input(z.object({ labelId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await labelService.removeLabel(input.labelId);
      if (!deleted) {
        throw new Error(`Label with ID "${input.labelId}" not found`);
      }
      return { success: true, message: "Label removed successfully" };
    }),

  // Re-import Excel labels
  reimportLabels: protectedProcedure
    .input(z.object({
      excelPath: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const excelPath = input.excelPath || 'D:\\Teams\\Extracted_Labels_0112 1.xlsx';
      await labelService.loadLabelsFromExcel(excelPath);
      
      const labels = labelService.getAllLabels();
      return { 
        success: true, 
        message: `Successfully reimported ${labels.size} labels`,
        count: labels.size
      };
    }),

  // Get label statistics
  getLabelStats: publicProcedure.query(async () => {
    const labels = labelService.getAllLabels();
    
    const stats = {
      totalLabels: labels.size,
      avgLabelLength: 0,
      labelsWithDescription: 0,
    };
    
    if (labels.size > 0) {
      let totalLength = 0;
      let withDescription = 0;
      
      for (const label of Array.from(labels.values())) {
        totalLength += label.labelText.length;
        if (label.description) {
          withDescription++;
        }
      }
      
      stats.avgLabelLength = Math.round(totalLength / labels.size);
      stats.labelsWithDescription = withDescription;
    }
    
    return stats;
  }),
});
