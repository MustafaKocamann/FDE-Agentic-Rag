from app.services.ingestion import load_file, chunk_documents
from pathlib import Path


docs = load_file(Path("data/sample_kb/company_hr.md"))
chunked_docs = chunk_documents(docs)

print(len(chunked_docs))