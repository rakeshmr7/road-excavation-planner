import asyncio
import uuid
import os
from PIL import Image, ImageDraw, ImageFont
from app.services.rag_service import index_policy_document, collection

async def test_ocr_pipeline():
    print("--- STARTING OCR PIPELINE TEST ---")
    
    # 1. Create a mock policy image file
    image_path = "test_ocr_policy.png"
    img = Image.new("RGB", (800, 400), color="white")
    draw = ImageDraw.Draw(img)
    
    # Draw simple clause text
    text_content = (
        "MUNICIPAL REGULATION SECTION 4.2\n"
        "All utility providers must obtain clearance before cutting pavements.\n"
        "No excavations allowed on Inner Ring Road during heavy rain forecasts."
    )
    # Write using default font
    draw.text((50, 50), text_content, fill="black")
    img.save(image_path)
    print(f"Generated mock policy image at: {image_path}")

    # 2. Setup mock policy ID and run indexing pipeline
    mock_policy_id = uuid.uuid4()
    
    try:
        # Run indexing (will trigger perform_ocr_on_image using PaddleOCR)
        await index_policy_document(mock_policy_id, image_path)
        
        # 3. Query ChromaDB to verify chunk insertion and metadata properties
        print("\nVerifying data in ChromaDB...")
        results = collection.get(
            where={"policy_id": str(mock_policy_id)},
            include=["documents", "metadatas"]
        )
        
        documents = results.get("documents", [])
        metadatas = results.get("metadatas", [])
        
        print(f"Chunks found in ChromaDB: {len(documents)}")
        assert len(documents) > 0, "No chunks were indexed in ChromaDB."
        
        for doc, meta in zip(documents, metadatas):
            print(f"  -> Chunk Content: {repr(doc)}")
            print(f"  -> Metadata: {meta}")
            assert meta["extraction_method"] == "ocr", f"Expected extraction method to be 'ocr', got {meta['extraction_method']}"
            assert meta["page_number"] == 1, f"Expected page number to be 1, got {meta['page_number']}"
            assert "ocr_confidence" in meta, "Expected 'ocr_confidence' in metadata keys."
            if meta["ocr_confidence"] is not None:
                assert 0.0 <= meta["ocr_confidence"] <= 1.0, f"Invalid OCR confidence score: {meta['ocr_confidence']}"
                
        print("\n--- OCR PIPELINE TEST PASSED SUCCESSFULLY! ---")
        
    finally:
        # 4. Clean up mock database records and test image
        collection.delete(where={"policy_id": str(mock_policy_id)})
        if os.path.exists(image_path):
            os.remove(image_path)
            print("Cleaned up test image file.")

if __name__ == "__main__":
    asyncio.run(test_ocr_pipeline())
