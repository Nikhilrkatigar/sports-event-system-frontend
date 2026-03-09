import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
  </div>
);

export const TableRowSkeleton = ({ columns = 5 }) => (
  <tr className="border-t border-gray-200">
    {Array(columns).fill(0).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </td>
    ))}
  </tr>
);

export const ImageSkeleton = ({ height = 'h-48', width = 'w-full' }) => (
  <div className={`${width} ${height} bg-gray-200 rounded-lg animate-pulse`}></div>
);

export const ListItemSkeleton = () => (
  <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 animate-pulse">
    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {Array(4).fill(0).map((_, i) => (
      <div key={i}>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    ))}
  </div>
);

export const TextSkeleton = ({ lines = 3 }) => (
  <div className="space-y-2 animate-pulse">
    {Array(lines).fill(0).map((_, i) => (
      <div key={i} className={`h-3 bg-gray-200 rounded ${i === lines - 1 ? 'w-4/5' : 'w-full'}`}></div>
    ))}
  </div>
);
