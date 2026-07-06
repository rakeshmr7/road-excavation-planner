import os
import sys
import uuid
import asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.services.rag_service import index_policy_document

async def reindex_all():
    policies_dir = os.path.join(os.path.dirname(__file__), 'backend', 'storage', 'policies')
    for filename in os.listdir(policies_dir):
        if not filename.endswith('.pdf'):
            continue
        try:
            # Extract policy_id
            parts = filename.split('_', 1)
            policy_id_str = parts[0]
            # Validate it's a UUID
            try:
                policy_id = uuid.UUID(policy_id_str)
            except ValueError:
                # If it doesn't start with UUID, create a dummy one
                policy_id = uuid.uuid4()
            
            file_path = os.path.join(policies_dir, filename)
            print(f"Re-indexing {filename} with ID {policy_id} ...")
            await index_policy_document(policy_id, file_path)
        except Exception as e:
            print(f"Failed to reindex {filename}: {e}")

if __name__ == '__main__':
    asyncio.run(reindex_all())
