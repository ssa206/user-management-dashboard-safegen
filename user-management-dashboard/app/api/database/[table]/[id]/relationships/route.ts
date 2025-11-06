import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET all related records for a specific row
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, id } = await params;
    const db = getDb();

    // Clean up old OTPs (older than 3 days) if querying the otps table
    if (table.toLowerCase() === 'otps') {
      try {
        await db.query(`
          DELETE FROM otps 
          WHERE created_at < NOW() - INTERVAL '3 days'
        `);
      } catch (error) {
        console.error('Error cleaning up old OTPs:', error);
        // Continue even if cleanup fails
      }
    }

    // Get the main record
    const mainRecord = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    
    if (mainRecord.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Get foreign key relationships for this table
    const relationshipsQuery = await db.query(`
      SELECT
        tc.table_name as from_table,
        kcu.column_name as from_column,
        ccu.table_name as to_table,
        ccu.column_name as to_column,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND (tc.table_name = $1 OR ccu.table_name = $1)
    `, [table]);

    const relationships = relationshipsQuery.rows;
    const relatedRecords: any = {};

    // For each relationship, fetch related records
    for (const rel of relationships) {
      if (rel.from_table === table) {
        // This table references another table
        const foreignKeyValue = mainRecord.rows[0][rel.from_column];
        if (foreignKeyValue) {
          const relatedData = await db.query(
            `SELECT * FROM ${rel.to_table} WHERE ${rel.to_column} = $1`,
            [foreignKeyValue]
          );
          
          if (!relatedRecords[rel.to_table]) {
            relatedRecords[rel.to_table] = [];
          }
          relatedRecords[rel.to_table].push(...relatedData.rows);
        }
      } else if (rel.to_table === table) {
        // Another table references this table
        const relatedData = await db.query(
          `SELECT * FROM ${rel.from_table} WHERE ${rel.from_column} = $1`,
          [id]
        );
        
        if (!relatedRecords[rel.from_table]) {
          relatedRecords[rel.from_table] = [];
        }
        relatedRecords[rel.from_table].push(...relatedData.rows);
      }
    }

    return NextResponse.json({
      mainRecord: {
        table,
        data: mainRecord.rows[0]
      },
      relatedRecords,
      relationships: relationships.map(r => ({
        from: r.from_table,
        to: r.to_table,
        fromColumn: r.from_column,
        toColumn: r.to_column
      }))
    });
  } catch (error: any) {
    console.error('Error fetching relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationships', details: error.message },
      { status: 500 }
    );
  }
}

