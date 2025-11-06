import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET all users with pagination and search
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const db = getDb();
    
    // Get column names to build search query
    const columnsResult = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    
    // Build search condition
    let searchCondition = '';
    let searchParams_arr: any[] = [];
    
    if (search) {
      const searchConditions = columns.map((col, idx) => {
        const colType = columnsResult.rows[idx].data_type;
        // Only search text-based columns
        if (['character varying', 'text', 'character'].includes(colType)) {
          return `${col}::text ILIKE $${searchParams_arr.length + 1}`;
        }
        return null;
      }).filter(Boolean);
      
      if (searchConditions.length > 0) {
        searchCondition = 'WHERE ' + searchConditions.join(' OR ');
        searchParams_arr = Array(searchConditions.length).fill(`%${search}%`);
      }
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users ${searchCondition}`;
    const countResult = await db.query(countQuery, searchParams_arr);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    const dataQuery = `
      SELECT * FROM users 
      ${searchCondition}
      ORDER BY id ASC 
      LIMIT $${searchParams_arr.length + 1} 
      OFFSET $${searchParams_arr.length + 2}
    `;
    const result = await db.query(dataQuery, [...searchParams_arr, limit, offset]);
    
    return NextResponse.json({ 
      users: result.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const db = getDb();
    
    // Get column names from the users table
    const columnsResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name != 'id'
    `);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    const values = columns.map(col => body[col]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await db.query(
      `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    );
  }
}

