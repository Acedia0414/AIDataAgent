import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as db from './db';
import { eq } from 'drizzle-orm';

export interface LabelInfo {
  labelId: string;
  labelText: string;
}

export class LabelService {
  private labelsCache: Map<string, string> = new Map();
  private cacheLoaded = false;

  /**
   * Load label data from Excel file to database
   */
  async loadLabelsFromExcel(excelPath: string): Promise<void> {
    try {
      console.log(`[Label Service] Loading labels from: ${excelPath}`);
      
      // Read Excel file
      const fileBuffer = readFileSync(excelPath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Use first worksheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON data
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`[Label Service] Found ${data.length} rows in Excel file`);
      
      // Clear existing labels
      await this.clearAllLabels();
      
      // Parse label data and batch insert to database
      const labelsToInsert: LabelInfo[] = [];
      let loadedCount = 0;
      
      for (const row of data as any[]) {
        // Use correct column names: Column B LabelId, Column C LabelText
        const labelId = row['LabelId'];
        const labelText = row['LabelText'];
        
        if (labelId && labelText) {
          labelsToInsert.push({
            labelId: String(labelId),
            labelText: String(labelText)
          });
          loadedCount++;
        }
      }
      
      console.log(`[Label Service] Parsed ${loadedCount} valid labels from Excel`);
      
      // Batch insert to database
      if (labelsToInsert.length > 0) {
        await this.insertLabelsBatch(labelsToInsert);
      }
      
      // Clear cache to force reload
      this.labelsCache.clear();
      this.cacheLoaded = false;
      
      console.log(`[Label Service] Successfully loaded ${labelsToInsert.length} labels into database`);
      
    } catch (error) {
      console.error('[Label Service] Error loading labels from Excel:', error);
      throw error;
    }
  }

  /**
   * Batch insert labels to database
   */
  private async insertLabelsBatch(labels: LabelInfo[]): Promise<void> {
    try {
      const dbConnection = await db.getDb();
      if (!dbConnection) throw new Error("Database not available");

      // Batch insert to avoid memory issues
      const BATCH_SIZE = 1000;
      for (let i = 0; i < labels.length; i += BATCH_SIZE) {
        const batch = labels.slice(i, i + BATCH_SIZE);
        
        const insertData = batch.map(label => ({
          labelId: label.labelId,
          labelText: label.labelText
        }));

        await dbConnection.insert(db.labels).values(insertData);
        console.log(`[Label Service] Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(labels.length / BATCH_SIZE)} (${batch.length} labels)`);
      }
    } catch (error) {
      console.error('[Label Service] Error inserting labels batch:', error);
      throw error;
    }
  }

  /**
   * Clear all labels
   */
  private async clearAllLabels(): Promise<void> {
    try {
      const dbConnection = await db.getDb();
      if (!dbConnection) throw new Error("Database not available");

      await dbConnection.delete(db.labels);
      console.log('[Label Service] Cleared all existing labels from database');
    } catch (error) {
      console.error('[Label Service] Error clearing labels:', error);
      throw error;
    }
  }

  /**
   * Load labels from database to cache
   */
  private async loadLabelsToCache(): Promise<void> {
    if (this.cacheLoaded) return;

    try {
      const dbConnection = await db.getDb();
      if (!dbConnection) throw new Error("Database not available");

      const labels = await dbConnection.select().from(db.labels);
      
      this.labelsCache.clear();
      for (const label of labels) {
        this.labelsCache.set(label.labelId, label.labelText);
      }
      
      this.cacheLoaded = true;
      console.log(`[Label Service] Loaded ${this.labelsCache.size} labels into cache`);
    } catch (error) {
      console.error('[Label Service] Error loading labels to cache:', error);
      throw error;
    }
  }

  /**
   * Get label text by Label ID
   */
  async getLabelText(labelId: string): Promise<string | undefined> {
    await this.loadLabelsToCache();
    return this.labelsCache.get(labelId);
  }

  /**
   * Get all labels
   */
  async getAllLabels(): Promise<Map<string, LabelInfo>> {
    await this.loadLabelsToCache();
    const result = new Map<string, LabelInfo>();
    
    for (const [labelId, labelText] of Array.from(this.labelsCache.entries())) {
      result.set(labelId, { labelId, labelText });
    }
    
    return result;
  }

  /**
   * Add label text for table names and field names
   */
  async enhanceWithLabels(tableName: string, fields: Array<{ fieldName: string; label?: string }>): Promise<Array<{ fieldName: string; label?: string; labelText?: string }>> {
    await this.loadLabelsToCache();
    
    return Promise.all(fields.map(async field => {
      const enhancedField: { fieldName: string; label?: string; labelText?: string } = { ...field };
      
      // If field has label, try to get corresponding label text
      if (field.label) {
        const labelText = await this.getLabelText(field.label);
        if (labelText) {
          enhancedField.labelText = labelText;
        }
      }
      
      // Can also try using field name directly as label ID
      const fieldLabelText = await this.getLabelText(field.fieldName);
      if (fieldLabelText && !enhancedField.labelText) {
        enhancedField.labelText = fieldLabelText;
      }
      
      return enhancedField;
    }));
  }

  /**
   * Get label text for table name
   */
  async getTableLabel(tableName: string): Promise<string | undefined> {
    return this.getLabelText(tableName);
  }

  /**
   * Add or update label
   */
  async addLabel(labelId: string, labelText: string): Promise<void> {
    try {
      const dbConnection = await db.getDb();
      if (!dbConnection) throw new Error("Database not available");

      await dbConnection.insert(db.labels).values({ labelId, labelText })
        .onDuplicateKeyUpdate({ set: { labelText } });

      // Update cache
      this.labelsCache.set(labelId, labelText);
      
      console.log(`[Label Service] Added/updated label: ${labelId}`);
    } catch (error) {
      console.error('[Label Service] Error adding label:', error);
      throw error;
    }
  }

  /**
   * Delete label
   */
  async removeLabel(labelId: string): Promise<boolean> {
    try {
      const dbConnection = await db.getDb();
      if (!dbConnection) throw new Error("Database not available");

      const result = await dbConnection.delete(db.labels).where(eq(db.labels.labelId, labelId));
      
      // Update cache
      this.labelsCache.delete(labelId);
      
      // For MySQL, check if any rows were affected
      return result.length > 0 || result[0]?.affectedRows > 0;
    } catch (error) {
      console.error('[Label Service] Error removing label:', error);
      throw error;
    }
  }

  /**
   * Search labels
   */
  async searchLabels(query: string): Promise<LabelInfo[]> {
    await this.loadLabelsToCache();
    const lowerQuery = query.toLowerCase();
    
    const results: LabelInfo[] = [];
    for (const [labelId, labelText] of Array.from(this.labelsCache.entries())) {
      if (labelId.toLowerCase().includes(lowerQuery) || 
          labelText.toLowerCase().includes(lowerQuery)) {
        results.push({ labelId, labelText });
      }
    }
    
    return results;
  }

  /**
   * Get label statistics
   */
  async getLabelStats(): Promise<{ totalLabels: number; avgLabelLength: number }> {
    await this.loadLabelsToCache();
    
    if (this.labelsCache.size === 0) {
      return { totalLabels: 0, avgLabelLength: 0 };
    }
    
    let totalLength = 0;
    for (const labelText of Array.from(this.labelsCache.values())) {
      totalLength += labelText.length;
    }
    
    return {
      totalLabels: this.labelsCache.size,
      avgLabelLength: Math.round(totalLength / this.labelsCache.size)
    };
  }
}

// Export singleton instance
export const labelService = new LabelService();
