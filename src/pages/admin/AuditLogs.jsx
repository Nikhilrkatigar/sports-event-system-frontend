import { useEffect, useState } from 'react';
import API from '../../utils/api';
import { TableRowSkeleton } from '../../components/Skeletons';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/audit')
      .then(r => setLogs(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Action</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Admin</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Timestamp</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                </>
              ) : logs.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-12 text-gray-400">No logs yet</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{log.action}</td>
                    <td className="px-4 py-3 text-gray-500">{log.admin || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
