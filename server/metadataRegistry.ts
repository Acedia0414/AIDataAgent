import * as fs from 'fs';
import * as path from 'path';
import { getDb } from './db.js';
import { metadataTables } from '../drizzle/schema';

/**
 * Types of D365 Metadata Objects we track
 */
export enum AxObjectType {
    Table = 'AxTable',
    View = 'AxView',
    DataEntity = 'AxDataEntityView',
    // Future: AxClass, AxForm, etc.
}

/**
 * Registry to track all available D365 metadata files on disk.
 * Allows instant lookups of "Does this object exist?" and "What type is it?".
 */
export class MetadataRegistry {
    private static instance: MetadataRegistry;

    // Maps ObjectName -> { type, absolutePath }
    // Example: "VendTable" -> { type: AxObjectType.Table, path: "/.../AxTable/VendTable.xml" }
    private registry = new Map<string, { type: AxObjectType; path: string }>();

    private axRootPath: string;
    private initialized = false;

    private constructor() {
        this.axRootPath = path.join(process.cwd(), 'Ax');
    }

    public static getInstance(): MetadataRegistry {
        if (!MetadataRegistry.instance) {
            MetadataRegistry.instance = new MetadataRegistry();
        }
        return MetadataRegistry.instance;
    }

    /**
     * Scan the filesystem and build the registry.
     * Call this on server startup or when manually refreshing metadata.
     */
    public async refreshRegistry(): Promise<void> {
        console.log('[MetadataRegistry] Scanning metadata files...');
        const start = Date.now();
        this.registry.clear();

        // First load from database
        try {
            const db = await getDb();
            if (db) {
                const tables = await db.select().from(metadataTables);
                
                console.log(`[MetadataRegistry] Loading ${tables.length} tables from database`);
                
                for (const table of tables) {
                    this.registry.set(table.tableName, { 
                        type: AxObjectType.Table, 
                        path: `database://${table.tableName}` 
                    });
                }
            }
        } catch (error) {
            console.warn('[MetadataRegistry] Failed to load from database:', error);
        }

        // Then scan file system (as fallback)
        this.scanDirectoryForType(path.join(this.axRootPath, 'AxTable'), AxObjectType.Table);
        this.scanDirectoryForType(path.join(this.axRootPath, 'AxView'), AxObjectType.View);
        this.scanDirectoryForType(path.join(this.axRootPath, 'AxDataEntityView'), AxObjectType.DataEntity);

        this.initialized = true;
        const duration = Date.now() - start;
        console.log(`[MetadataRegistry] Scan complete in ${duration}ms. Found ${this.registry.size} objects.`);
    }

    /**
     * Recursively scan a directory for XML files and register them
     */
    private scanDirectoryForType(dirPath: string, type: AxObjectType) {
        if (!fs.existsSync(dirPath)) return;

        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    // Recurse into subdirectories
                    this.scanDirectoryForType(fullPath, type);
                } else if (entry.isFile() && entry.name.endsWith('.xml')) {
                    // Register the file
                    const objectName = path.parse(entry.name).name;
                    this.registry.set(objectName, { type, path: fullPath });
                }
            }
        } catch (err) {
            console.warn(`[MetadataRegistry] Failed to scan directory ${dirPath}:`, err);
        }
    }

    /**
     * Check if an object exists in the registry logic
     */
    public hasObject(objectName: string): boolean {
        if (!this.initialized) {
            // Synchronous call will fail, so check basic tables first
            return this.basicTableCheck(objectName);
        }
        return this.registry.has(objectName);
    }

    /**
     * Get type of an object (e.g., Table vs View)
     */
    public getObjectType(objectName: string): AxObjectType | undefined {
        if (!this.initialized) {
            this.basicTableCheck(objectName);
        }
        return this.registry.get(objectName)?.type;
    }

    /**
     * Get absolute path to the XML definition
     */
    public getObjectPath(objectName: string): string | undefined {
        if (!this.initialized) {
            this.basicTableCheck(objectName);
        }
        return this.registry.get(objectName)?.path;
    }

    /**
     * Get all registered object names
     */
    public getAllObjectNames(): Set<string> {
        if (!this.initialized) {
            // Return basic table set
            return new Set([
                'PurchTable', 'VendTable', 'CustTable', 'SalesTable', 
                'InventTable', 'LedgerTable', 'HcmWorker', 'ProjTable',
                'ProdTable', 'BOMTable', 'SalesLine', 'PurchLine'
            ]);
        }
        return new Set(this.registry.keys());
    }

    /**
     * Get raw map for advanced usage
     */
    public getRegistryMap() {
        if (!this.initialized) {
            this.basicTableCheck('dummy');
        }
        return this.registry;
    }

    /**
     * Basic table check for common D365 tables
     */
    private basicTableCheck(objectName: string): boolean {
        const commonTables = [
            'PurchTable', 'VendTable', 'CustTable', 'SalesTable', 
            'InventTable', 'LedgerTable', 'HcmWorker', 'ProjTable',
            'ProdTable', 'BOMTable', 'SalesLine', 'PurchLine'
        ];
        
        if (commonTables.includes(objectName)) {
            this.registry.set(objectName, { 
                type: AxObjectType.Table, 
                path: `database://${objectName}` 
            });
            return true;
        }
        return false;
    }
}

// Export singleton helper
export const metadataRegistry = MetadataRegistry.getInstance();
