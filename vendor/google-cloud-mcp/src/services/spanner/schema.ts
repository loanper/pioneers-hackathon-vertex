/**
 * Schema utilities for Google Cloud Spanner
 */
import { SpannerSchema, SpannerTable, getSpannerClient } from "./types.js";
import { logger } from "../../utils/logger.js";

/**
 * Extracts schema information from Spanner database
 *
 * @param instanceId Spanner instance ID
 * @param databaseId Spanner database ID
 * @returns Schema information for the database
 */
export async function getSpannerSchema(
  instanceId: string,
  databaseId: string,
): Promise<SpannerSchema> {
  const spanner = await getSpannerClient();
  logger.debug(
    `Using Spanner client with project ID: ${spanner.projectId} for getSpannerSchema`,
  );
  const instance = spanner.instance(instanceId);
  const database = instance.database(databaseId);

  // Query for tables
  const [tablesResult] = await database.run({
    sql: `SELECT t.table_name
          FROM information_schema.tables t
          WHERE t.table_catalog = '' AND t.table_schema = ''
          ORDER BY t.table_name`,
  });

  if (!tablesResult || tablesResult.length === 0) {
    return { tables: [] };
  }

  const tables: SpannerTable[] = [];

  // Process each table to get columns
  for (const tableRow of tablesResult) {
    const tableName = (tableRow as any).table_name as string;

    // Get columns for this table
    const [columnsResult] = await database.run({
      sql: `SELECT column_name, spanner_type, is_nullable
            FROM information_schema.columns
            WHERE table_catalog = '' AND table_schema = '' AND table_name = @tableName
            ORDER BY ordinal_position`,
      params: { tableName },
    });

    const columns = columnsResult.map((col: any) => ({
      name: col.column_name as string,
      type: col.spanner_type as string,
      nullable: col.is_nullable === "YES",
    }));

    // Get indexes for this table
    const [indexesResult] = await database.run({
      sql: `SELECT i.index_name, ic.column_name, i.is_unique
            FROM information_schema.indexes i
            JOIN information_schema.index_columns ic
              ON i.table_catalog = ic.table_catalog
              AND i.table_schema = ic.table_schema
              AND i.table_name = ic.table_name
              AND i.index_name = ic.index_name
            WHERE i.table_catalog = '' AND i.table_schema = '' AND i.table_name = @tableName
            ORDER BY i.index_name, ic.ordinal_position`,
      params: { tableName },
    });

    // Group index columns by index name
    const indexMap = new Map<
      string,
      { name: string; columns: string[]; unique: boolean }
    >();
    for (const idx of indexesResult) {
      const indexName = (idx as any).index_name as string;
      const columnName = (idx as any).column_name as string;
      const isUnique = (idx as any).is_unique as boolean;

      if (!indexMap.has(indexName)) {
        indexMap.set(indexName, {
          name: indexName,
          columns: [],
          unique: isUnique,
        });
      }

      indexMap.get(indexName)?.columns.push(columnName);
    }

    const indexes = Array.from(indexMap.values());

    // Get foreign keys for this table (if available)
    let foreignKeys: {
      name: string;
      columns: string[];
      referencedTable: string;
      referencedColumns: string[];
    }[] = [];

    try {
      // Note: This query might fail in some Spanner databases that don't have the referential_constraints view
      const [foreignKeysResult] = await database.run({
        sql: `SELECT
                rc.constraint_name,
                kcu1.column_name,
                kcu2.table_name AS referenced_table,
                kcu2.column_name AS referenced_column
              FROM information_schema.referential_constraints rc
              JOIN information_schema.key_column_usage kcu1
                ON kcu1.constraint_name = rc.constraint_name
              JOIN information_schema.key_column_usage kcu2
                ON kcu2.constraint_name = rc.unique_constraint_name
              WHERE kcu1.table_catalog = '' AND kcu1.table_schema = '' 
                AND kcu1.table_name = @tableName
              ORDER BY rc.constraint_name, kcu1.ordinal_position`,
        params: { tableName },
      });

      // Group foreign key columns by constraint name
      const fkMap = new Map<
        string,
        {
          name: string;
          columns: string[];
          referencedTable: string;
          referencedColumns: string[];
        }
      >();
      for (const fk of foreignKeysResult) {
        const constraintName = (fk as any).constraint_name as string;
        const columnName = (fk as any).column_name as string;
        const referencedTable = (fk as any).referenced_table as string;
        const referencedColumn = (fk as any).referenced_column as string;

        if (!fkMap.has(constraintName)) {
          fkMap.set(constraintName, {
            name: constraintName,
            columns: [],
            referencedTable,
            referencedColumns: [],
          });
        }

        const entry = fkMap.get(constraintName);
        if (entry) {
          entry.columns.push(columnName);
          entry.referencedColumns.push(referencedColumn);
        }
      }

      foreignKeys = Array.from(fkMap.values());
    } catch (error) {
      logger.warn(
        `Error fetching foreign keys for table ${tableName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continue without foreign keys if the query fails
    }

    tables.push({
      name: tableName,
      columns,
      indexes: indexes.length > 0 ? indexes : undefined,
      foreignKeys: foreignKeys.length > 0 ? foreignKeys : undefined,
    });
  }

  return { tables };
}

/**
 * Formats schema information as markdown
 *
 * @param schema The schema to format
 * @returns A markdown string representation of the schema
 */
export function formatSchemaAsMarkdown(schema: SpannerSchema): string {
  if (schema.tables.length === 0) {
    return "No tables found in the database.";
  }

  let markdown = "# Database Schema\n\n";

  for (const table of schema.tables) {
    markdown += `## Table: ${table.name}\n\n`;

    // Columns
    markdown += "### Columns\n\n";
    markdown += "| Column | Type | Nullable |\n";
    markdown += "|--------|------|----------|\n";

    for (const column of table.columns) {
      markdown += `| ${column.name} | ${column.type} | ${column.nullable ? "YES" : "NO"} |\n`;
    }

    markdown += "\n";

    // Indexes
    if (table.indexes && table.indexes.length > 0) {
      markdown += "### Indexes\n\n";
      markdown += "| Name | Columns | Unique |\n";
      markdown += "|------|---------|--------|\n";

      for (const index of table.indexes) {
        markdown += `| ${index.name} | ${index.columns.join(", ")} | ${index.unique ? "YES" : "NO"} |\n`;
      }

      markdown += "\n";
    }

    // Foreign Keys
    if (table.foreignKeys && table.foreignKeys.length > 0) {
      markdown += "### Foreign Keys\n\n";
      markdown +=
        "| Name | Columns | Referenced Table | Referenced Columns |\n";
      markdown += "|------|---------|-----------------|-------------------|\n";

      for (const fk of table.foreignKeys) {
        markdown += `| ${fk.name} | ${fk.columns.join(", ")} | ${fk.referencedTable} | ${fk.referencedColumns.join(", ")} |\n`;
      }

      markdown += "\n";
    }

    markdown += "---\n\n";
  }

  return markdown;
}
