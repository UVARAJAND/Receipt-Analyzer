import re
from datetime import date, datetime
from typing import Dict
import logging
from io import BytesIO
import numpy as np
import easyocr
from pdf2image import convert_from_bytes
from PIL import Image
import PyPDF2
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain_core.runnables import RunnableSequence
from dateutil import parser
import os
from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from enum import Enum
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.ext.hybrid import hybrid_property

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CategoryEnum(str, Enum):
    FOOD = "Food"
    TRANSPORT = "Transport"
    UTILITIES = "Utilities"
    ENTERTAINMENT = "Entertainment"
    SHOPPING = "Shopping"
    HEALTH = "Health"
    OTHER = "Other"

class ReceiptProcessor:
    def __init__(self):
        self.groq_api_key = groq_api_key
        self.template = """
            You will be given OCR text from a receipt or invoice.
            Extract the following fields from the text:
            - Vendor Name
            - Date
            - Total Amount
            - Category (food, transport, utilities, shopping, entertainment, health, others)
            - Description (a short summary including important details)

            Return the output strictly in this format:
            <vendor>...</vendor>
            <date>...</date>
            <amount>...</amount>
            <category>...</category>
            <description>...</description>

            Text:
            {text}
        """

    def process_uploaded_file(self, file_bytes: bytes, file_extension: str) -> Dict:
        """Process uploaded file and return extracted data"""
        try:
            text = self._extract_text(file_bytes, file_extension)
            extracted_data = self._parse_receipt_text(text)
            extracted_data["raw_text"] = extracted_data.get("description")
            return extracted_data
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            raise

    def _extract_text(self, file_bytes: bytes, file_extension: str) -> str:
        """Extract text from various file types using EasyOCR and direct PDF extraction"""
        try:
            reader = easyocr.Reader(['en'], gpu=False)
            if file_extension.lower() in ('.jpg', '.jpeg', '.png'):
                image = Image.open(BytesIO(file_bytes))
                result = reader.readtext(np.array(image), detail=0, paragraph=True)
                return "\n".join(result)
            elif file_extension.lower() == '.pdf':
                # Try direct text extraction first
                pdf_reader = PyPDF2.PdfReader(BytesIO(file_bytes))
                text_blocks = []
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_blocks.append(page_text)
                text = "\n".join(text_blocks).strip()
                # If direct extraction fails, use OCR
                if not text or len(text) < 10:
                    images = convert_from_bytes(file_bytes)
                    ocr_blocks = []
                    for img in images:
                        result = reader.readtext(np.array(img), detail=0, paragraph=True)
                        ocr_blocks.append("\n".join(result))
                    text = "\n".join(ocr_blocks)
                return text
            elif file_extension.lower() == '.txt':
                return file_bytes.decode('utf-8')
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise
    def _sanitize_amount(self, raw: str) -> float:
        """Remove currency symbols and commas, return float"""
        if not raw:
            return 0.0
        clean = ''.join(c for c in raw if c.isdigit() or c == '.')
        try:
            return float(clean)
        except ValueError:
            return 0.0

    def _parse_receipt_text(self, text: str) -> Dict:
        prompt = PromptTemplate.from_template(self.template)
        from pydantic import SecretStr
        llm = ChatGroq(
            model="llama3-70b-8192",
            api_key=SecretStr(self.groq_api_key),
            stop_sequences=[]  # Provide an empty list or appropriate stop sequences
        )
        from langchain_core.runnables import RunnableSerializable
        chain: RunnableSerializable = prompt | llm
        response = chain.invoke({"text": text})
        if hasattr(response, "content"):
            response_text = response.content
        else:
            response_text = str(response)

        vendor = re.search(r"<vendor>(.*?)</vendor>", response_text)
        date_ = re.search(r"<date>(.*?)</date>", response_text)
        amount = re.search(r"<amount>(.*?)</amount>", response_text)
        category = re.search(r"<category>(.*?)</category>", response_text)
        description = re.search(r"<description>(.*?)</description>", response_text)
        

        return {
            "vendor_name": vendor.group(1) if vendor else "",
            "date": date_.group(1) if date_ else "",
            "amount": self._sanitize_amount(amount.group(1)) if amount else 0.0,
            "category": category.group(1) if category else "",
            "description": description.group(1) if description else ""
        }
    

