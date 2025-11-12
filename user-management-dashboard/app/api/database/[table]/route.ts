import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET data from any table with pagination and search
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'id';
    const sortOrder = searchParams.get('sortOrder') || 'ASC';
    const offset = (page - 1) * limit;

    const db = getDb();
    
    // Validate table exists
    const tableCheck = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    
    if (tableCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }
    
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
    
    // Get column info
    const columnsResult = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    
    const columns = columnsResult.rows.map((row: any) => row.column_name);
    const validSortBy = columns.includes(sortBy) ? sortBy : columns[0];
    
    // Build search condition
    let searchCondition = '';
    let countParams: any[] = [];
    let dataParams: any[] = [];
    
    if (search) {
      const searchValue = `%${search}%`;
      const searchConditions: string[] = [];
      let paramIndex = 1;
      
      columnsResult.rows.forEach((row: any) => {
        const colType = row.data_type;
        const colName = row.column_name;
        if (['character varying', 'text', 'character'].includes(colType)) {
          searchConditions.push(`${colName}::text ILIKE $${paramIndex}`);
          countParams.push(searchValue);
          dataParams.push(searchValue);
          paramIndex++;
        }
      });
      
      if (searchConditions.length > 0) {
        searchCondition = 'WHERE ' + searchConditions.join(' OR ');
      }
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ${table} ${searchCondition}`;
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    const validSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const dataQuery = `
      SELECT * FROM ${table}
      ${searchCondition}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${dataParams.length + 1} 
      OFFSET $${dataParams.length + 2}
    `;
    const result = await db.query(dataQuery, [...dataParams, limit, offset]);
    
    return NextResponse.json({ 
      data: result.rows,
      columns: columns,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error.message },
      { status: 500 }
    );
  }
}

