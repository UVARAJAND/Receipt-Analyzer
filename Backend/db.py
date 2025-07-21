# db.py
from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, Index, create_engine, and_
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from sqlalchemy import and_
from typing import List
from datetime import date

Base = declarative_base()

class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True, index=True)
    vendor = Column(String(100), index=True)
    data = Column(Text)
    amount = Column(Numeric(12, 2), index=True)
    category = Column(String(50), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index('idx_vendor_category', 'vendor', 'category'),)

# class DocumentFilter(BaseModel):
#     vendor: Optional[str] = None
#     category: Optional[str] = None
#     startDate: Optional[str] = None
#     endDate: Optional[str] = None
#     minAmount: Optional[float] = None
#     maxAmount: Optional[float] = None

class DocumentFilter(BaseModel):
    vendor: Optional[str] = None
    startDate: Optional[date] = None
    endDate: Optional[date] = None
    minAmount: Optional[float] = None
    maxAmount: Optional[float] = None
    category: Optional[str] = None

# DB setup
DATABASE_URL = "sqlite:///./local_documents.db"
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CRUD functions (use injected db)
def insert(db: Session, vendor: str, data: str, amount: float, category: str, date: str):
    parsed_date = datetime.strptime(date, '%Y-%m-%d') if date else datetime.utcnow()
    new_doc = Document(
        vendor=vendor,
        data=data,
        amount=amount,
        category=category,
        created_at=parsed_date
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc

# def get_all_documents(db: Session):
#     docs = db.query(Document).all()
#     return [
#         {
#             "id": doc.id,
#             "vendor": doc.vendor,
#             "date": doc.created_at.strftime("%Y-%m-%d"),
#             "amount": float(doc.amount),
#             "category": doc.category
#         }
#         for doc in docs
#     ]

def get_all_documents(db: Session, offset: int = 0, limit: int = 50):
    docs = db.query(Document).offset(offset).limit(limit).all()
    return [
        {
            "id": doc.id,
            "vendor": doc.vendor,
            "date": doc.created_at.strftime("%Y-%m-%d"),
            "amount": float(doc.amount),
            "category": doc.category
        }
        for doc in docs
    ]


def get_document_by_id(db: Session, doc_id: int):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    return {
        "id": doc.id,
        "vendor": doc.vendor,
        "date": doc.created_at.strftime('%Y-%m-%d'),
        "amount": float(doc.amount),
        "category": doc.category,
        "data": doc.data
    } if doc else None

def update_document_by_id(db: Session, doc_id: int, updated_doc):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return {"error": "Document not found"}
    doc.vendor = updated_doc.vendor
    doc.amount = updated_doc.amount
    doc.category = updated_doc.category
    doc.data = updated_doc.data
    doc.created_at = datetime.strptime(updated_doc.date, '%Y-%m-%d')
    db.commit()
    db.refresh(doc)
    return {"message": "Document updated successfully", "id": doc.id}

def delete_document_by_id(db: Session, doc_id: int):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return {"error": "Document not found"}
    db.delete(doc)
    db.commit()
    return {"message": f"Document ID {doc_id} deleted successfully"}


# def filter_documents(db: Session, filters: DocumentFilter) -> List[dict]:
#     query = db.query(Document)
#     conditions = []

#     # Vendor filter (non-empty string)
#     if filters.vendor and filters.vendor.strip():
#         conditions.append(Document.vendor.ilike(f"%{filters.vendor.strip()}%"))

#     # Category filter (non-empty string)
#     if filters.category and filters.category.strip():
#         conditions.append(Document.category.ilike(f"%{filters.category.strip()}%"))

#     # Date range filters
#     if filters.startDate:
#         conditions.append(Document.created_at >= filters.startDate)
#     if filters.endDate:
#         conditions.append(Document.created_at <= filters.endDate)

#     # Amount filters
#     if filters.minAmount is not None:
#         conditions.append(Document.amount >= filters.minAmount)
#     if filters.maxAmount is not None:
#         conditions.append(Document.amount <= filters.maxAmount)

#     # Apply conditions
#     if conditions:
#         query = query.filter(and_(*conditions))

#     query = query.order_by(Document.created_at.desc())
#     results = query.all()

#     return [
#         {
#             "id": doc.id,
#             "vendor": doc.vendor,
#             "date": doc.created_at.strftime("%Y-%m-%d"),
#             "amount": float(doc.amount),
#             "category": doc.category
#         }
#         for doc in results
#     ]

def filter_documents(
    db: Session,
    filters: DocumentFilter,
    offset: int = 0,
    limit: int = 2000
) -> dict:
    query = db.query(Document)
    conditions = []

    if filters.vendor and filters.vendor.strip():
        conditions.append(Document.vendor.ilike(f"%{filters.vendor.strip()}%"))

    if filters.category and filters.category.strip():
        conditions.append(Document.category.ilike(f"%{filters.category.strip()}%"))

    if filters.startDate:
        conditions.append(Document.created_at >= filters.startDate)

    if filters.endDate:
        conditions.append(Document.created_at <= filters.endDate)

    if filters.minAmount is not None:
        conditions.append(Document.amount >= filters.minAmount)

    if filters.maxAmount is not None:
        conditions.append(Document.amount <= filters.maxAmount)

    if conditions:
        query = query.filter(and_(*conditions))

    total_count = query.count()
    docs = query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "results": [
            {
                "id": doc.id,
                "vendor": doc.vendor,
                "date": doc.created_at.strftime("%Y-%m-%d"),
                "amount": float(doc.amount),
                "category": doc.category
            }
            for doc in docs
        ],
        "total": total_count
    }


# Create DB on startup
Base.metadata.create_all(bind=engine)
