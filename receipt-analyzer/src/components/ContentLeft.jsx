import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppContext } from './AppContext';
import EditData from './EditData';
import '../App.css';

function ContentLeft() {
  const {
    hasMore,
    setHasMore,
    offset,
    setOffset,
    receipts,
    setReceipts,
    filters
  } = useContext(AppContext);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const observer = useRef();
  const lastRowRef = useRef(null);
  const limit = 20;

  const cleanFilters = Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [key, value === '' ? null : value])
  );

  const loadDocuments = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:8000/filter_documents?offset=${offset}&limit=${limit}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanFilters)
        }
      );

      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();

      if (data.results.length === 0) {
        setHasMore(false);
      } else {
        setReceipts((prev) => offset === 0 ? data.results : [...prev, ...data.results]);
        setOffset((prev) => prev + data.results.length);
        setHasMore(data.results.length === limit);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [cleanFilters, offset, hasMore, loading]);

  // Reset state + load on filters change
  useEffect(() => {
    const fetchOnFilterChange = async () => {
      setReceipts([]);
      setOffset(0);
      setHasMore(true);
      setLoading(true);

      try {
        const response = await fetch(
          `http://localhost:8000/filter_documents?offset=0&limit=${limit}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanFilters)
          }
        );

        if (!response.ok) throw new Error('Failed to fetch documents');
        const data = await response.json();
        setReceipts(data.results);
        setOffset(data.results.length);
        setHasMore(data.results.length === limit);
      } catch (err) {
        console.error('Initial load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOnFilterChange();
  }, [filters]);

  // Infinite scroll setup
  useEffect(() => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        loadDocuments();
      }
    }, {
      root: null,
      rootMargin: '200px',
      threshold: 0
    });

    if (lastRowRef.current) {
      observer.current.observe(lastRowRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [receipts, hasMore, loading, loadDocuments]);

  const handleRowClick = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/documents/${id}`);
      const data = await res.json();
      setSelectedDoc(data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    }
  };

  return (
    <div className="contentLeft">
      <div className="tableContain">
        <table className="receiptTable">
          <thead>
            <tr>
              <th>No.</th>
              <th>Vendor</th>
              <th>Date</th>
              <th>Amount (₹)</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((item, index) => (
              <tr
                key={`${item.id}-${index}`}
                onClick={() => handleRowClick(item.id)}
                ref={index === receipts.length - 1 ? lastRowRef : null}
              >
                <td>{index + 1}</td>
                <td>{item.vendor}</td>
                <td>{item.date}</td>
                <td>{item.amount.toFixed(2)}</td>
                <td>{item.category}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <p style={{ textAlign: 'center', padding: '1rem' }}>Loading...</p>}
        {!hasMore && !loading && <p style={{ textAlign: 'center', padding: '1rem' }}>No more documents</p>}
      </div>

      {selectedDoc && (
        <EditData
          selectedDoc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onSave={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}

export default ContentLeft;
