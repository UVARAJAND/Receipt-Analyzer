// Search.jsx
import React, { useContext } from 'react';
import { AppContext } from './AppContext';
import '../App.css';

function Search() {
  const { setReceipts, filters, setFilters, setOffset, setHasMore } = useContext(AppContext);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const exportFilteredFile = async (format) => {
    const cleanedFilters = Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value === '' ? null : value])
    );

    try {
      const response = await fetch(`http://localhost:8000/download?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedFilters)
      });

      if (!response.ok) throw new Error(`Download failed: ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `filtered_receipts.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const clearFilters = async () => {
    const cleared = {
      vendor: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      category: ''
    };
    setFilters(cleared);
    setReceipts([]);
    setOffset(0);
    setHasMore(true);
  };

  return (
    <div className="Search">
      <div className="filter-container">
        <div className="filter-group">
          <label>Name / Vendor:</label>
          <input type="text" name="vendor" value={filters.vendor} onChange={handleChange} />
        </div>

        <div className="filter-group">
          <label>Amount Range:</label>
          <input type="number" name="minAmount" placeholder="Min" value={filters.minAmount} onChange={handleChange} />
          <span>to</span>
          <input type="number" name="maxAmount" placeholder="Max" value={filters.maxAmount} onChange={handleChange} />
        </div>

        <div className="filter-group">
          <span>Date Range:</span>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleChange} />
          <span>to</span>
          <input type="date" name="endDate" value={filters.endDate} onChange={handleChange} />
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select name="category" value={filters.category} onChange={handleChange}>
            <option value="">All Categories</option>
            <option value="food">Food</option>
            <option value="utilities">Utilities</option>
            <option value="shopping">Shopping</option>
            <option value="entertainment">entertainment</option>
            <option value="health">health</option>
            <option value="others">others</option>
          </select>
        </div>

        <div className="filter-group">
          <button onClick={clearFilters}>Clear</button>
        </div>

        <div className="filter-group">
          <button onClick={() => exportFilteredFile('csv')}>Download CSV</button>
          <button onClick={() => exportFilteredFile('json')}>Download JSON</button>
          <button onClick={() => exportFilteredFile('excel')}>Download Excel</button>
        </div>
      </div>
    </div>
  );
}

export default Search;
