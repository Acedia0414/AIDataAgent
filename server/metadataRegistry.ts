import * as fs from 'fs';
import * as path from 'path';

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
    public refreshRegistry(): void {
        console.log('[MetadataRegistry] Scanning metadata files...');
        const start = Date.now();
        this.registry.clear();

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
        if (!this.initialized) this.refreshRegistry();
        return this.registry.has(objectName);
    }

    /**
     * Get type of an object (e.g., Table vs View)
     */
    public getObjectType(objectName: string): AxObjectType | undefined {
        if (!this.initialized) this.refreshRegistry();
        return this.registry.get(objectName)?.type;
    }

    /**
     * Get absolute path to the XML definition
     */
    public getObjectPath(objectName: string): string | undefined {
        if (!this.initialized) this.refreshRegistry();
        return this.registry.get(objectName)?.path;
    }

    /**
     * Get all registered object names
     */
    public getAllObjectNames(): Set<string> {
        if (!this.initialized) this.refreshRegistry();
        return new Set(this.registry.keys());
    }

    /**
     * Get raw map for advanced usage
     */
    public getRegistryMap() {
        if (!this.initialized) this.refreshRegistry();
        return this.registry;
    }
}

// Export singleton helper
export const metadataRegistry = MetadataRegistry.getInstance();
