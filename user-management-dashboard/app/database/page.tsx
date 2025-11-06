'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Table {
  table_name: string;
  column_count: number;
  row_count: number;
}

interface Relationship {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  constraint_name: string;
}

interface TableData {
  [key: string]: any;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface RelationshipData {
  mainRecord: {
    table: string;
    data: any;
  };
  relatedRecords: {
    [tableName: string]: any[];
  };
  relationships: Array<{
    from: string;
    to: string;
    fromColumn: string;
    toColumn: string;
  }>;
}

export default function DatabaseExplorerPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, totalCount: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'graph'>('list');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedRow, setSelectedRow] = useState<{ table: string; id: any } | null>(null);
  const [relationshipData, setRelationshipData] = useState<RelationshipData | null>(null);
  const [loadingRelationships, setLoadingRelationships] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable, pagination.page, pagination.limit, searchQuery]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      fetchTables();
      fetchRelationships();
    } catch (err) {
      router.push('/login');
    }
  };

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/database/tables');
      const data = await response.json();
      if (response.ok) {
        setTables(data.tables);
      }
    } catch (err) {
      console.error('Failed to fetch tables');
    }
  };

  const fetchRelationships = async () => {
    try {
      const response = await fetch('/api/database/relationships');
      const data = await response.json();
      if (response.ok) {
        setRelationships(data.relationships);
      }
    } catch (err) {
      console.error('Failed to fetch relationships');
    }
  };

  const fetchTableData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchQuery
      });
      const response = await fetch(`/api/database/${selectedTable}?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setTableData(data.data);
        setColumns(data.columns);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch table data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setTimeout(() => {
      router.push('/login');
    }, 800);
  };

  const getTableRelationships = (tableName: string) => {
    return relationships.filter(
      rel => rel.from_table === tableName || rel.to_table === tableName
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRowClick = async (row: any) => {
    const rowId = row.id;
    setSelectedRow({ table: selectedTable, id: rowId });
    setView('graph');
    setLoadingRelationships(true);

    try {
      const response = await fetch(`/api/database/${selectedTable}/${rowId}/relationships`);
      const data = await response.json();
      
      if (response.ok) {
        setRelationshipData(data);
      }
    } catch (err) {
      console.error('Failed to fetch relationship data');
    } finally {
      setLoadingRelationships(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Logout Animation */}
      {loggingOut && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center animate-fade-in">
          <div className="text-center">
            <div className="mb-6 inline-block">
              <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">Logging out...</h2>
            <p className="text-gray-600">See you soon!</p>
          </div>
        </div>
      )}

      {/* Collapsible Sidebar */}
      <div 
        className={`${sidebarOpen ? 'w-80' : 'w-16'} border-r-4 border-black bg-gray-50 transition-all duration-300 flex-shrink-0`}
      >
        <div className="sticky top-0 h-screen flex flex-col">
          {/* Sidebar Header */}
          <div className={`border-b-4 border-black bg-white flex items-center ${sidebarOpen ? 'p-4 justify-between' : 'p-2 justify-center'}`}>
            {sidebarOpen && (
              <h2 className="font-bold text-black text-xl">
                Tables
              </h2>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors font-bold text-lg"
              title={sidebarOpen ? 'Collapse' : 'Expand'}
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>

          {/* Table List */}
          <div className={`flex-1 overflow-y-auto ${sidebarOpen ? 'p-4' : 'p-2'}`}>
            {tables.map((table) => {
              const rels = getTableRelationships(table.table_name);
              const isSelected = selectedTable === table.table_name;
              
              return (
                <button
                  key={table.table_name}
                  onClick={() => {
                    setSelectedTable(table.table_name);
                    setView('list');
                    setSelectedRow(null);
                    setRelationshipData(null);
                  }}
                  className={`w-full text-left mb-2 border-2 border-black rounded-lg transition-all ${
                    sidebarOpen ? 'p-3' : 'p-2'
                  } ${
                    isSelected 
                      ? 'bg-black text-white' 
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                  title={table.table_name}
                >
                  {sidebarOpen ? (
                    <div>
                      <div className="font-bold capitalize">
                        {table.table_name}
                      </div>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                        {table.row_count} rows • {table.column_count} columns
                        {rels.length > 0 && ` • ${rels.length} links`}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-[10px] font-bold">
                      {table.table_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className={`border-t-4 border-black bg-white space-y-3 ${sidebarOpen ? 'p-4' : 'p-2'}`}>
            <button
              onClick={() => router.push('/dashboard')}
              className={`w-full border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors rounded-xl ${
                sidebarOpen ? 'px-4 py-3' : 'px-2 py-2 text-lg'
              }`}
              title="Go to Dashboard"
            >
              {sidebarOpen ? '← Dashboard' : 'H'}
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={`w-full bg-black text-white font-bold hover:bg-gray-800 transition-colors rounded-xl disabled:opacity-50 ${
                sidebarOpen ? 'px-4 py-3' : 'px-2 py-2 text-lg'
              }`}
            >
              {sidebarOpen ? (loggingOut ? 'Logging out...' : 'Logout') : '⏻'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b-4 border-black bg-white p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-black capitalize">
              {selectedTable} Table
            </h1>
            
            {/* View Toggle */}
            <div className="flex gap-2 border-2 border-black rounded-xl overflow-hidden">
              <button
                onClick={() => setView('list')}
                className={`px-6 py-2 font-bold transition-colors ${
                  view === 'list' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setView('graph')}
                className={`px-6 py-2 font-bold transition-colors ${
                  view === 'graph' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                Graph View
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {view === 'list' ? (
            <div>
              {/* Search Bar */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full px-6 py-3 border-2 border-black text-black bg-white focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-xl"
                />
              </div>

              {/* Table */}
              <div className="border-4 border-black overflow-hidden shadow-lg bg-white rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black text-white">
                      <tr>
                        {columns.map((col) => (
                          <th key={col} className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider">
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-200">
                      {tableData.map((row, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => handleRowClick(row)}
                          className="hover:bg-gray-50 transition-colors cursor-pointer hover:scale-[1.01] transform"
                          title="Click to view relationships"
                        >
                          {columns.map((col) => (
                            <td key={col} className="px-6 py-5 text-sm text-black font-medium">
                              {row[col] !== null && row[col] !== undefined 
                                ? String(row[col]).substring(0, 50) 
                                : '-'}
                              {row[col] && String(row[col]).length > 50 ? '...' : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 0 && (
                <div className="mt-6 flex justify-between items-center p-4 border-2 border-black rounded-xl bg-white">
                  <span className="text-sm font-bold">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount}
                  </span>
                  <div className="flex gap-2">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        className={`px-4 py-2 border-2 border-black font-bold rounded-lg ${
                          pagination.page === pageNum ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : loadingRelationships ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="mb-4 inline-block">
                  <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-lg font-bold">Loading relationships...</p>
              </div>
            </div>
          ) : relationshipData ? (
            <RelationshipGraphView 
              data={relationshipData}
              onBack={() => {
                setSelectedRow(null);
                setRelationshipData(null);
                setView('list');
              }}
            />
          ) : (
            <div className="border-4 border-black rounded-2xl bg-gray-50 p-12 text-center">
              <p className="text-xl font-bold text-gray-600 mb-4">
                Select a row from the list view to see its relationships
              </p>
              <button
                onClick={() => setView('list')}
                className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Go to List View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Relationship Graph View Component - Mind Map Style
function RelationshipGraphView({ 
  data, 
  onBack 
}: { 
  data: RelationshipData;
  onBack: () => void;
}) {
  const mainRecord = data.mainRecord;
  const relatedRecords = data.relatedRecords;
  
  // Pan and Zoom state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Selected node state
  const [selectedNode, setSelectedNode] = useState<{ type: 'main' | 'related'; data: any; table: string } | null>(null);
  
  // Hover state for z-index management
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Calculate total related records
  const totalRelated = Object.values(relatedRecords).reduce((sum, records) => sum + records.length, 0);

  // Flatten all related records with their table names
  const allRelatedNodes: Array<{ table: string; record: any; tableIdx: number; recordIdx: number }> = [];
  Object.entries(relatedRecords).forEach(([tableName, records], tableIdx) => {
    records.forEach((record, recordIdx) => {
      allRelatedNodes.push({ table: tableName, record, tableIdx, recordIdx });
    });
  });

  // Calculate positions in a circular mind map layout
  const centerX = 600; // Center X position
  const centerY = 400; // Center Y position
  const radius = 350; // Distance from center

  // Handle mouse wheel for zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.5, scale + delta), 3);
    setScale(newScale);
  };

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  // Handle mouse move while dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset view
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors rounded-xl"
          >
            ← Back to List
          </button>
          <button
            onClick={resetView}
            className="px-6 py-3 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors rounded-xl"
            title="Reset zoom and position"
          >
            Reset View
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold text-gray-600 bg-white border-2 border-black px-4 py-2 rounded-xl">
            Zoom: {Math.round(scale * 100)}%
          </div>
          <div className="text-sm font-bold text-gray-600">
            {totalRelated} related record{totalRelated !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Mind Map Container */}
      <div 
        className="border-4 border-black rounded-2xl bg-gray-50 overflow-hidden relative"
        style={{ height: '800px', cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
          <div 
            className="absolute"
            style={{ 
              minWidth: '1200px', 
              minHeight: '800px', 
              width: '1200px', 
              height: '800px',
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            
            {/* SVG for connection lines */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
              {allRelatedNodes.map((node, idx) => {
                const angle = (idx / allRelatedNodes.length) * 2 * Math.PI - Math.PI / 2;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                return (
                  <line
                    key={idx}
                    x1={centerX}
                    y1={centerY}
                    x2={x}
                    y2={y}
                    stroke="black"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                );
              })}
            </svg>

            {/* Center Node - Main Record */}
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ 
                left: `${centerX}px`, 
                top: `${centerY}px`,
                zIndex: hoveredNodeId === 'main' ? 100 : 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode({ type: 'main', data: mainRecord.data, table: mainRecord.table });
              }}
              onMouseEnter={() => setHoveredNodeId('main')}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              <div className={`bg-black text-white border-4 border-black rounded-2xl p-6 shadow-2xl w-[280px] transition-all ${
                hoveredNodeId === 'main' ? 'shadow-[0_0_30px_rgba(0,0,0,0.5)] scale-105' : ''
              } ${selectedNode?.type === 'main' ? 'ring-4 ring-white' : ''}`}>
                <div className="text-center mb-4">
                  <div className="text-xl font-bold uppercase">{mainRecord.table}</div>
                  <div className="text-xs opacity-75 mt-1">Main Record (Click for details)</div>
                </div>
                <div className="space-y-2 border-t-2 border-white pt-4">
                  {Object.entries(mainRecord.data).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <div className="font-bold opacity-75 uppercase">{key}:</div>
                      <div className="truncate">
                        {value !== null && value !== undefined ? String(value) : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Related Record Nodes - Positioned in Circle */}
            {allRelatedNodes.map((node, idx) => {
              const angle = (idx / allRelatedNodes.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              const nodeId = `${node.table}-${idx}`;
              const isHovered = hoveredNodeId === nodeId;
              const isSelected = selectedNode?.type === 'related' && 
                                 selectedNode?.table === node.table && 
                                 selectedNode?.data.id === node.record.id;
              
              return (
                <div
                  key={nodeId}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ 
                    left: `${x}px`, 
                    top: `${y}px`,
                    zIndex: isHovered ? 100 : 20,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode({ type: 'related', data: node.record, table: node.table });
                  }}
                  onMouseEnter={() => setHoveredNodeId(nodeId)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  <div className={`bg-white border-4 border-black rounded-xl p-4 transition-all w-[220px] ${
                    isHovered ? 'shadow-[0_0_30px_rgba(0,0,0,0.5)] scale-110' : 'shadow-lg'
                  } ${isSelected ? 'ring-4 ring-black' : ''}`}>
                    <div className="mb-3 pb-3 border-b-2 border-gray-200">
                      <div className="text-xs font-bold text-gray-500 uppercase text-center">
                        {node.table}
                      </div>
                      <div className="text-xs text-center text-gray-400 mt-1">
                        ID: {node.record.id}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(node.record)
                        .filter(([key]) => key !== 'id')
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <div className="font-bold text-gray-600 uppercase">{key}:</div>
                            <div className="text-black truncate">
                              {value !== null && value !== undefined 
                                ? String(value).substring(0, 30) 
                                : '-'}
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="text-xs text-center text-gray-400 mt-3 pt-3 border-t-2 border-gray-200">
                      Click for details
                    </div>
                  </div>
                </div>
              );
            })}

            {/* No relationships message */}
            {totalRelated === 0 && (
              <div 
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: '50%', top: '50%' }}
              >
                <div className="text-center py-12">
                  <p className="text-xl font-bold text-gray-600">
                    No related records found
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    This record has no foreign key relationships
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-4 left-4 bg-white border-2 border-black rounded-xl px-4 py-3 text-xs font-bold pointer-events-none">
            <div>Drag to pan</div>
            <div>Scroll to zoom</div>
          </div>

          {/* Side Panel - Node Details (Inside Canvas) */}
          {selectedNode && (
            <div className="absolute top-4 right-4 w-96 pointer-events-auto z-50">
              <div className="border-4 border-black rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Node Details</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(null);
                    }}
                    className="px-3 py-1 border-2 border-black rounded-lg hover:bg-gray-100 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Node Type Badge */}
                  <div className={`inline-block px-4 py-2 rounded-lg font-bold text-sm ${
                    selectedNode.type === 'main' 
                      ? 'bg-black text-white border-2 border-black' 
                      : 'bg-white text-black border-2 border-black'
                  }`}>
                    {selectedNode.type === 'main' ? 'Main Record' : 'Related Record'}
                  </div>

                  {/* Table Name */}
                  <div className="border-b-2 border-gray-200 pb-3">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-1">Table</div>
                    <div className="text-lg font-bold capitalize">{selectedNode.table}</div>
                  </div>

                  {/* All Fields */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">All Fields</div>
                    {Object.entries(selectedNode.data).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                        <div className="text-xs font-bold text-gray-600 uppercase mb-1">{key}</div>
                        <div className="text-sm text-black break-words">
                          {value !== null && value !== undefined 
                            ? String(value)
                            : <span className="text-gray-400 italic">null</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Relationship Details */}
      {data.relationships.length > 0 && (
        <div className="border-4 border-black rounded-2xl bg-white p-6">
          <h3 className="text-xl font-bold mb-4">Relationship Details</h3>
          <div className="space-y-3">
            {data.relationships.map((rel, idx) => (
              <div 
                key={idx}
                className="p-4 border-2 border-black rounded-xl bg-gray-50 flex items-center gap-4"
              >
                <span className="font-bold capitalize">{rel.from}</span>
                <span className="text-xs text-gray-500">({rel.fromColumn})</span>
                <span className="text-xl">→</span>
                <span className="font-bold capitalize">{rel.to}</span>
                <span className="text-xs text-gray-500">({rel.toColumn})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Graph View Component
function GraphView({ 
  tables, 
  relationships,
  selectedTable,
  onSelectTable 
}: { 
  tables: Table[];
  relationships: Relationship[];
  selectedTable: string;
  onSelectTable: (table: string) => void;
}) {
  return (
    <div className="border-4 border-black rounded-2xl bg-white p-8 min-h-[600px]">
      <h3 className="text-2xl font-bold mb-6">Database Relationships</h3>
      
      <div className="flex flex-wrap gap-8 items-center justify-center">
        {tables.map((table) => {
          const isSelected = selectedTable === table.table_name;
          const relatedTables = new Set<string>();
          
          relationships.forEach(rel => {
            if (rel.from_table === table.table_name) {
              relatedTables.add(rel.to_table);
            }
            if (rel.to_table === table.table_name) {
              relatedTables.add(rel.from_table);
            }
          });

          return (
            <div key={table.table_name} className="relative">
              <button
                onClick={() => onSelectTable(table.table_name)}
                className={`p-6 border-4 border-black rounded-2xl transition-all ${
                  isSelected ? 'bg-black text-white scale-110' : 'bg-white text-black hover:scale-105'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold capitalize mb-2">{table.table_name}</div>
                  <div className={`text-xs mt-2 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                    {table.column_count} columns
                  </div>
                  {relatedTables.size > 0 && (
                    <div className={`text-xs mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                      {relatedTables.size} connected
                    </div>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Relationships List */}
      {relationships.length > 0 && (
        <div className="mt-12">
          <h4 className="text-xl font-bold mb-4">Foreign Key Relationships</h4>
          <div className="space-y-3">
            {relationships.map((rel, idx) => (
              <div 
                key={idx}
                className="p-4 border-2 border-black rounded-xl bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="font-bold capitalize">{rel.from_table}</span>
                  <span className="text-gray-500">({rel.from_column})</span>
                  <span className="text-2xl">→</span>
                  <span className="font-bold capitalize">{rel.to_table}</span>
                  <span className="text-gray-500">({rel.to_column})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

