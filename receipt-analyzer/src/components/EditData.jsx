import React, { useState,useContext , useEffect } from 'react';
import '../App.css'
import { AppContext } from './AppContext';
function EditData({ selectedDoc, onClose, onSave }) {
  const [doc, setDoc] = useState({ ...selectedDoc });
const {receipts,setReceipts}=useContext(AppContext);
  useEffect(() => {
    setDoc(selectedDoc);
  }, [selectedDoc]);
  const fetchDocuments = () => {
    fetch("http://127.0.0.1:8000/documents")
        .then((res) => res.json())
        .then((data) => {
            console.log("📦 Initial documents:", data);
            setReceipts(data);
        })
        .catch((err) => {
            console.error("Error fetching documents:", err);
        });
};
  const handleChange = (e) => {
    setDoc({ ...doc, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    await fetch(`http://localhost:8000/documents/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    onSave();
    fetchDocuments();
  };
  const handleDelete = async () => {
  const confirmDelete = window.confirm("Are you sure you want to delete this document?");
  if (!confirmDelete) return;

  try {
    await fetch(`http://localhost:8000/documents/${doc.id}`, {
      method: 'DELETE',
    });
    onClose();
    fetchDocuments();
  } catch (err) {
    console.error("Failed to delete the document", err);
  }
};


  return (
    <div className="modal">
      <div className="modalContent">
        <h2>Edit Document</h2>
        <label>Vendor: </label><input name="vendor" value={doc.vendor} onChange={handleChange} />
        <label>Date: </label><input name="date" type="date" value={doc.date} onChange={handleChange} />
        <label>Amount: </label><input name="amount" type="number" value={doc.amount} onChange={handleChange} />
<label>Category: </label>
<select name="category" value={doc.category} onChange={handleChange}>
            {/* <option value="">All Categories</option> */}
            <option value="food">Food</option>
            <option value="utilities">Utilities</option>
            <option value="shopping">Shopping</option>
            <option value="entertainment">entertainment</option>
            <option value="health">health</option>
            <option value="others">others</option>
</select>
{/* </label> */}
        <label>Data: </label><textarea name="data" value={doc.data} onChange={handleChange} rows={6}/>
        <button onClick={handleSave}>💾 Save</button>
        <button onClick={onClose}>❌ Cancel</button>
        <button onClick={handleDelete}>🗑️ Delete</button>
      </div>
    </div>
  );
}

export default EditData;
