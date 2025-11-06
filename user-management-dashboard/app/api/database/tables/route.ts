import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET all tables in the database
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    
    // Get all tables in the public schema
    const tablesResult = await db.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    // Get row count for each table
    const tablesWithCounts = await Promise.all(
      tablesResult.rows.map(async (table: any) => {
        try {
          const countResult = await db.query(
            `SELECT COUNT(*) as row_count FROM "${table.table_name}"`
          );
          return {
            ...table,
            row_count: parseInt(countResult.rows[0].row_count)
          };
        } catch (error) {
          // If error fetching count, return 0
          return {
            ...table,
            row_count: 0
          };
        }
      })
    );
    
    // Filter out empty tables
    const nonEmptyTables = tablesWithCounts.filter((table: any) => table.row_count > 0);
    
    return NextResponse.json({ tables: nonEmptyTables });
  } catch (error: any) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables', details: error.message },
      { status: 500 }
    );
  }
}

