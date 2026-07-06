import React from "react";

interface AuditLogsTabProps {
  auditLogs: any[];
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ auditLogs }) => {
  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4 animate-fade-in">
      <div>
        <h2 className="text-md font-bold text-slate-800">GCC Audit Trail Console</h2>
        <p className="text-xs text-slate-500 font-medium">
          Tamper-proof digital logs tracking user permissions and AI calculations
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-slate-600 border-collapse">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
            <tr>
              <th className="p-3 border-b">Log ID</th>
              <th className="p-3 border-b">Action</th>
              <th className="p-3 border-b">IP Address</th>
              <th className="p-3 border-b">Timestamp</th>
              <th className="p-3 border-b">Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                  No system logs found.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-slate-50/55 transition">
                  <td className="p-3 font-mono text-[10px] text-slate-500">{log.id}</td>
                  <td className="p-3">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 font-mono">{log.ip_address}</td>
                  <td className="p-3 text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3 text-slate-500 truncate max-w-[200px]" title={log.new_value ? JSON.stringify(log.new_value) : ""}>
                    {log.new_value ? JSON.stringify(log.new_value) : "None"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
