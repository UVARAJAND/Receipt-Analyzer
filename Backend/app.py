# app.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from pdf2image import convert_from_bytes
from fastapi.exceptions import RequestValidationError
from io import BytesIO
from fastapi.exception_handlers import request_validation_exception_handler
import os, logging, uvicorn
import traceback
from Extraction import ReceiptProcessor
from typing import Optional
from fastapi import Query
from fastapi import Body
from fastapi.responses import StreamingResponse
import pandas as pd
from db import (
    DocumentFilter,
    get_db,
    get_all_documents,
    get_document_by_id,
    insert,
    update_document_by_id,
    delete_document_by_id,
    filter_documents
)
from sqlalchemy.orm import Session
import pytesseract

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
UPLOAD_FOLDER = "Saved_data"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = FastAPI()
logger = logging.getLogger(__name__)

class DocumentUpdate(BaseModel):
    vendor: str
    date: str
    amount: float
    category: str
    data: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _extract_text(file_bytes: bytes, file_extension: str) -> str:
    try:
        if file_extension.lower() in ('.jpg', '.jpeg', '.png'):
            return pytesseract.image_to_string(Image.open(BytesIO(file_bytes)))
        elif file_extension.lower() == '.pdf':
            images = convert_from_bytes(file_bytes, poppler_path=r"C:\poppler-23.11.0\Library\bin")
            return "\n".join(pytesseract.image_to_string(img) for img in images)
        elif file_extension.lower() == '.txt':
            return file_bytes.decode('utf-8')
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
    except Exception as e:
        logger.error(f"Text extraction failed: {e}")
        raise



# @app.post("/upload")
# async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
#     file_path = os.path.join(UPLOAD_FOLDER, file.filename)
#     try:
#         file_bytes = await file.read()
#         with open(file_path, "wb") as buffer:
#             buffer.write(file_bytes)
#         _, ext = os.path.splitext(file.filename)
#         extracted_text = _extract_text(file_bytes, ext)

#         insert(
#             db=db,
#             vendor="Apple",
#             data=extracted_text,
#             amount=159999.99,
#             category="utilities",
#             date="17-07-2025"
#         )
#         return {
#             "message": f"File '{file.filename}' uploaded and text extracted.",
#             "text": extracted_text
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        file_bytes = await file.read()
        filename = file.filename
        file_path = os.path.join(UPLOAD_FOLDER, filename)

        with open(file_path, "wb") as buffer:
            buffer.write(file_bytes)

        _, ext = os.path.splitext(filename)

        # Extract and parse receipt
        parsed_data = ReceiptProcessor().process_uploaded_file(file_bytes, ext)
        print("Parsed Data:", parsed_data)

        if not parsed_data:
            raise HTTPException(status_code=400, detail="Receipt parsing failed.")

        insert(
            db=db,
            vendor=parsed_data["vendor_name"],
            data=parsed_data["raw_text"],
            amount=parsed_data["amount"],
            category=parsed_data["category"],
            date=parsed_data["date"]
        )

        return {
            "message": f"File '{filename}' uploaded and data inserted.",
            "extracted_data": parsed_data
        }

    except Exception as e:
        print("❌ Exception Occurred:")
        traceback.print_exc()  # <-- PRINTS the complete traceback in terminal
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/documents")
def read_documents(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, le=1000),
    db: Session = Depends(get_db)
):
    return get_all_documents(db, offset, limit)

@app.get("/documents/{doc_id}")
def fetch_document(doc_id: int, db: Session = Depends(get_db)):
    doc = get_document_by_id(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@app.put("/documents/{doc_id}")
def update_document(doc_id: int, updated_doc: DocumentUpdate, db: Session = Depends(get_db)):
    return update_document_by_id(db, doc_id, updated_doc)

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    result = delete_document_by_id(db, doc_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

# @app.post("/filter_documents")
# def filter_documents_endpoint(
#     vendor: Optional[str] = None,
#     category: Optional[str] = None,
#     startDate: Optional[str] = None,
#     endDate: Optional[str] = None,
#     minAmount: Optional[float] = None,
#     maxAmount: Optional[float] = None,
#     db: Session = Depends(get_db)
# ):
#     filters = DocumentFilter(
#         vendor=vendor,
#         category=category,
#         startDate=startDate,
#         endDate=endDate,
#         minAmount=minAmount,
#         maxAmount=maxAmount
#     )
#     try:
        
#         print(filter_documents(db,filters))
#         return filter_documents(db, filters)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Filtering failed: {str(e)}")

# @app.post("/filter_documents")
# def filter_documents_endpoint(
#     filters: DocumentFilter = Body(default={}),
#     db: Session = Depends(get_db)
# ):
#     try:
#         print("Received Filters:", filters.dict())
#         return filter_documents(db, filters)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Filtering failed: {str(e)}")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    # Print full exception details to console/log
    print("🔥 Validation error:", exc)
    print("🔥 Request body or query is invalid!")
    return await request_validation_exception_handler(request, exc)

@app.post("/filter_documents")
def filter_documents_endpoint(
    filters: DocumentFilter = Body(default={}),
    offset: int = Query(0),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    try:
        print(filters)
        return filter_documents(db, filters, offset, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filtering failed: {str(e)}")

@app.post("/download")
def download_filtered_data(
    filters: DocumentFilter = Body(default={}),
    format: str = Query("csv"),
    db: Session = Depends(get_db)
):
    try:
        data = filter_documents(db, filters)

        results = data.get("results", [])
        if not results:
            raise HTTPException(status_code=404, detail="No data found")

        df = pd.DataFrame([{k: v for k, v in item.items() if k != "id"} for item in results])

        if format == "csv":
            stream = BytesIO()
            df.to_csv(stream, index=False)
            stream.seek(0)
            return StreamingResponse(stream, media_type="text/csv", headers={
                "Content-Disposition": "attachment; filename=filtered_receipts.csv"
            })

        elif format == "json":
            json_bytes = BytesIO()
            json_bytes.write(df.to_json(orient="records").encode("utf-8"))
            json_bytes.seek(0)
            return StreamingResponse(json_bytes, media_type="application/json", headers={
                "Content-Disposition": "attachment; filename=filtered_receipts.json"
            })

        elif format == "excel":
            excel_stream = BytesIO()
            df.to_excel(excel_stream, index=False)
            excel_stream.seek(0)
            return StreamingResponse(excel_stream, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={
                "Content-Disposition": "attachment; filename=filtered_receipts.xlsx"
            })

        else:
            raise HTTPException(status_code=400, detail="Invalid format")

    except Exception as e:
        tb = traceback.format_exc()
        logging.error(f"Download failed with error: {str(e)}\nTraceback:\n{tb}")
        raise HTTPException(status_code=500, detail=f"Download failed with error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host='127.0.0.1', port=8000)
