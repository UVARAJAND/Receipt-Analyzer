// AppContext.js
import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [filters, setFilters] = useState({
    vendor: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    category: ''
  });
  const [receipts, setReceipts] = useState([]);
  const [offset, setOffset] = useState(0);

  const [tableData, setTableData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // New State for toggling view
  const [viewMode, setViewMode] = useState('search'); // default view
  // const [filters, setFilters] = useState({});
  return (
    <AppContext.Provider
      value={{
        filters,
        setFilters,
        tableData,
        setTableData,
        viewMode,
        setViewMode,
        receipts,setReceipts,offset, setOffset,hasMore, setHasMore
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
