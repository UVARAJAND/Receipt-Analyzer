import React, { useState, useRef, useContext, useEffect } from "react";
import "../App.css";
import { AppContext } from "./AppContext";
function Input() {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
      const { setReceipts } = useContext(AppContext);
          useEffect(() => {
        fetchDocuments();
    }, []);
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

    const fileBtnTrigger = () => {
        if (selectedFile) {
            handleClearFile();
        } else {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleClearFile = () => {
        setSelectedFile(null);
        fileInputRef.current.value = null;
    };

    const handleUpload = () => {
        if (!selectedFile) {
            alert("Please select a file first.");
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append("file", selectedFile);

        fetch("http://127.0.0.1:8000/upload", {
            method: "POST",
            body: formData
        })
            .then((res) => res.json())
            .then((data) => {
                // alert("File uploaded successfully!");
                console.log(data);
            })
            .then(()=>{
                fetch("http://127.0.0.1:8000/documents")
                .then(res => res.json())
                .then(data => {
                    console.log("📦 Refreshed documents:", data);
                    setReceipts(data);
          });
            })
            .catch((err) => {
                console.error("Upload failed:", err);
                alert("Failed to upload file.");
            })
            .finally(() => {
                setLoading(false);
                handleClearFile();
            });
    };

    return (
        <div className="InputBox">
            <input
                type="file"
                ref={fileInputRef}
                className="fileInput"
                onChange={handleFileChange}
                style={{ display: "none" }}
                accept=".pdf, .doc, .docx, .txt"
            />


            <span className="fileName">
                {selectedFile ? selectedFile.name : "Please Select the File"}
            </span>

            {loading ? <></> : <button
                className={`fileLabel ${selectedFile ? "CancelButton" : ""} ${loading ? "loading" : ""}`}
                onClick={fileBtnTrigger}
                disabled={loading}
            >
                {selectedFile ? "Cancel" : "Choose File"}
            </button>}

            <button
                className={`uploadButton ${loading ? "loading" : ""}`}
                onClick={handleUpload}
                disabled={loading}
            >
                {loading ? <span className="spinner"></span> : "Upload"}
            </button>
        </div>
    );
}

export default Input;
