import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.rag_service import embedding_fn

print("Testing embedding function...")
res = embedding_fn.get_embedding("Testing")
print("Vector length:", len(res))
print("First 5 elements:", res[:5])
