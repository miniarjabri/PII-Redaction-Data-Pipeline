"""
Document Redaction Lambda Function

This Lambda function is responsible for redacting PHI (Protected Health Information) from documents
using the results from Amazon Comprehend Medical and Amazon Textract. The function:

1. Loads Textract JSON (document layout) and Comprehend Medical JSON (PHI entities)
2. Downloads the original document from S3
3. Converts the document to images (for PDF, JPEG, PNG, or TIFF files)
4. Identifies text bounding boxes that contain PHI entities
5. Draws black rectangles over those bounding boxes to redact the PHI
6. Saves the redacted document and uploads it to S3
7. Optionally deletes the original document based on configuration

This is the final step in the PII redaction workflow that produces the redacted documents.
"""
import os
import json
import fitz  # PyMuPDF
import logging
import filetype
import string
from S3Functions import S3
from PIL import Image , ImageDraw, ImageSequence
from textractoverlayer.t_overlay import DocumentDimensions, get_bounding_boxes
from textractcaller.t_call import Textract_Types

logger = logging.getLogger(__name__)

def detect_file_type(doc_path: str) -> str:
    """Function gets the mime type of the file 
    """
    try:
        kind = filetype.guess(doc_path)
        if kind is None:
            raise Exception('Unable to determine mime type for file: {doc_path}')

        logger.debug('File extension: %s' % kind.extension)
        logger.debug('File MIME type: %s' % kind.mime)
        return kind.mime
    except Exception as e:        
        logger.error(e)
        raise e

def redacted_file_name(file_path: str) -> str:
    """Function gets a list of Pillow images from PDF/PNG/JPG files 
    """
    path_tuple = os.path.splitext(file_path)    
    local_redacted_path = f"{path_tuple[0]}-redacted{path_tuple[1]}"
    logger.debug(f"Local path for redacted file: {local_redacted_path}")
    return local_redacted_path

def get_pil_img(file_path: str) -> tuple[str, list[Image.Image]]:
    try:
        file_mime = detect_file_type(file_path)
        images = []
        if file_mime == "application/pdf":
            # gets an array of Pillow images from PDF file using PyMuPDF (much faster than pdfplumber)
            logger.debug("Converting PDF file to Pillow Images using PyMuPDF")
            pdf_document = None
            try:
                pdf_document = fitz.open(file_path)
                logger.info(f"PDF opened successfully. Pages: {len(pdf_document)}")
                
                for page_num in range(len(pdf_document)):
                    logger.debug(f"Processing PDF page {page_num+1}/{len(pdf_document)}")
                    page = pdf_document[page_num]
                    
                    # Increase resolution to 150 DPI for better text detection
                    # Matrix factors: 1.0 = 72 DPI, 2.0 = 144 DPI, etc.
                    dpi_factor = 2.1  # ~150 DPI - matches the original pdfplumber resolution
                    
                    try:
                        # Add alpha=False to ensure RGB output without alpha channel
                        pix = page.get_pixmap(matrix=fitz.Matrix(dpi_factor, dpi_factor), alpha=False)
                        # Convert pixmap to PIL Image
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        images.append(img)
                        # Free up memory immediately
                        pix = None
                    except Exception as page_error:
                        logger.error(f"Error processing page {page_num+1}: {page_error}")
                        # Continue with next page instead of failing the whole document
                        continue
            except Exception as pdf_error:
                logger.error(f"Error opening PDF document: {pdf_error}")
                raise pdf_error
            finally:
                # Make sure we always close the PDF document to free resources
                if pdf_document:
                    pdf_document.close()
                    logger.debug("PDF document closed")
        elif file_mime in ['image/jpeg', 'image/png', 'image/tiff']:
            logger.debug(f"Converting {file_mime} Image file to Pillow Images")
            im = Image.open(file_path)
            images = [img for img in ImageSequence.Iterator(im)]
        
        logger.debug(f"File type: {file_mime}, Total Pages: {len(images)}")
        
        try:
            # Log memory usage to monitor resource consumption
            import psutil
            process = psutil.Process(os.getpid())
            logger.info(f"Memory usage after image conversion: {process.memory_info().rss / 1024 / 1024:.2f} MB")
        except ImportError:
            pass
            
        return file_mime, images
    except Exception as e:
        logger.error("Failed to convert file to Pillow images")
        logger.error(e)
        raise e

def redact_doc(temp_file: str, textract_json: dict, comprehend_json: dict) -> str:
    """
    Redacts PDF/PNG/JPG files using Amazon Comprehend PHI entities and Textract OCR JSON.
    
    This function:
    1. Converts the document to Pillow images
    2. Gets document dimensions for each page
    3. Gets bounding boxes for text from Textract JSON
    4. Identifies which bounding boxes contain PHI entities
    5. Draws black rectangles over those bounding boxes
    6. Saves the redacted document
    
    Args:
        temp_file: Path to the document file
        textract_json: JSON output from Textract containing document layout
        comprehend_json: JSON output from Comprehend Medical containing PHI entities
        
    Returns:
        tuple: File MIME type and path to the redacted file
    """
    try:        
        file_mime, images = get_pil_img(file_path=temp_file)
        logger.debug(f"Getting local redacted file name from path {temp_file}")
        local_path = redacted_file_name(file_path=temp_file)

        if len(images) == 0:
            raise Exception(f'Unable to redact. No images returned from file, images : {len(images)}')        

        # Get document dimensions for each page
        logger.debug("Getting document dimensions")
        document_dimension = [DocumentDimensions(doc_width=img_sample.size[0], doc_height=img_sample.size[1]) for img_sample in images]
        
        # Set up overlay for text lines
        logger.debug("Setting overlay")
        overlay=[Textract_Types.LINE]
        
        # Get bounding boxes for text from Textract JSON
        logger.debug("Getting bounding boxes")
        bounding_box_list = get_bounding_boxes(textract_json=textract_json, document_dimensions=document_dimension, overlay_features=overlay)
        
        # Extract PHI entities from Comprehend Medical JSON
        entities = []
        entity_lookup = {}  # Optimization: Create lookup dictionary for faster matching
        
        for entity in comprehend_json['Entities']:
            entity_text = entity['Text']
            entities.append(entity_text)
            # Add lowercase entity to lookup dictionary
            entity_lookup[entity_text.lower()] = True
        
        logger.debug("PHI Entities found...")    
        logger.debug(entities)

        # Identify which bounding boxes contain PHI entities - Comprehensive matching
        redactions = []
        processed_boxes = set()  # Keep track of boxes we've already added
        
        # Combined approach that handles all matching cases:
        # 1. Exact matches: entity == bbox text
        # 2. Entity contained in bbox: "John" in "John Smith"
        # 3. Bbox text contained in entity: "John" in "John Smith MD"
        for idx, bbox in enumerate(bounding_box_list):
            if idx in processed_boxes:
                continue
                
            bbox_text_lower = bbox.text.lower()
            
            # Case 1: Direct match using lookup dictionary
            if bbox_text_lower in entity_lookup:
                redactions.append(bbox)
                processed_boxes.add(idx)
                continue
                
            # Case 2 & 3: Check bidirectional containment
            for entity in entities:
                entity_lower = entity.lower()
                if entity_lower in bbox_text_lower or bbox_text_lower in entity_lower:
                    redactions.append(bbox)
                    processed_boxes.add(idx)
                    break
                        
        logger.debug(f"Found {len(redactions)} boxes to redact")

        # Draw black rectangles over bounding boxes that contain PHI entities
        for idx,img in enumerate(images):
            draw = ImageDraw.Draw(img)
            page_num = idx + 1
            for box in redactions:
                if box.page_number == page_num:                    
                    draw.rectangle(xy=[box.xmin, box.ymin, box.xmax, box.ymax], fill="Black")

        if len(images) == 1:
            images[0].save(local_path)
            logger.info(f"Redaction complete. Redacted file saved as {local_path}")
            return file_mime, local_path
        else:
            images[0].save(local_path, save_all=True,append_images=images[1:])
            logger.info(f"Redaction complete. Redacted file saved as {local_path}")
            return file_mime, local_path
    except Exception as e:
        logger.error(e)
        raise e

def clean_up(local_paths: list[str], s3_keys: list[str], s3_retain_docs: bool, s3: S3) -> bool:
    """
    Cleans up local temporary files and optionally deletes original documents from S3.
    
    Args:
        local_paths: List of local file paths to delete
        s3_keys: List of S3 object keys to delete
        s3_retain_docs: Whether to retain original documents in S3
        s3: S3 helper object
        
    Returns:
        bool: True if cleanup was successful
    """
    logger.debug(f"Cleaning up local files {local_paths}")
    for path in local_paths:
        if(os.path.isfile(path)):
            #os.remove() function to remove the file
            os.remove(path)
            #Printing the confirmation message of deletion
            logger.info(f"Temp File {path} Deleted successfully")
        else:
            logger.info(f"Temp File {path} does not exist")

    # clean up files in S3       
    if not s3_retain_docs:
        logger.info(f"Retain documents is set to {s3_retain_docs}. Deleting un-redacted original file from S3")
        s3.delete_objects(objects=s3_keys)

    return True

def lambda_handler(event, context):
    """
    Lambda handler function invoked by Step Functions state machine.
    
    Redacts documents based on PHI entities detected by Amazon Comprehend Medical
    and document layout information from Amazon Textract.
    
    Args:
        event: Event data from Step Functions containing workflow_id, redact_data, bucket, and retain_docs
        context: Lambda context
        
    Returns:
        dict: Status of the redaction process
    """
    log_level = os.environ.get('LOG_LEVEL', 'INFO')    
    logger.setLevel(log_level)
    logger.info("Starting redaction Lambda handler")
    try:
        logger.info(f"PyMuPDF version: {fitz.__version__}")
    except AttributeError:
        logger.info("PyMuPDF version: unknown (no __version__ attribute available)")
    logger.debug(json.dumps(event))
    
    try:
        # Log memory usage to help diagnose resource issues
        import psutil
        process = psutil.Process(os.getpid())
        logger.info(f"Memory usage at start: {process.memory_info().rss / 1024 / 1024:.2f} MB")
    except ImportError:
        logger.info("psutil not available for memory tracking")

    # Extract parameters from the event
    retain_docs = event["retain_docs"]  # Whether to retain original documents
    doc_prefixes = event["redact_data"]  # List of documents to redact with their Textract and Comprehend Medical outputs
    bucket = event["bucket"]  # S3 bucket containing the documents
    workflow_id = event["workflow_id"]  # Workflow ID

    # Initialize S3 helper
    s3 = S3(bucket=bucket, log_level=log_level)
   
    # Process each document in the list
    for doc in doc_prefixes:
        logger.debug(doc)
        try:
            # Read Textract response JSON containing document layout information
            textract_op_content = s3.get_object_content(key=doc['txtract'])
            textract_op = json.loads(textract_op_content)
            logger.info("Loaded Textract JSON")
            logger.debug(textract_op)
            
            # Read Comprehend Medical PHI output JSON containing detected PHI entities
            comp_med_content = s3.get_object_content(key=doc['comp_med'])
            comp_med = json.loads(comp_med_content)
            logger.info("Loaded Comprehend Medical JSON")
            logger.debug(comp_med)

            # Get document information
            document = doc['doc']  # S3 key of the original document
            filename = os.path.basename(document)
            temp_file = f'/tmp/{filename}'
            
            # Download the document to the Lambda /tmp directory
            logger.info("Downloading document to /tmp/")
            s3.download_file(source_object=document, destination_file=temp_file)
        
            # Redact the document
            logger.info("Redacting document in /tmp/")
            file_mime, redacted_file = redact_doc(temp_file=temp_file, textract_json=textract_op, comprehend_json=comp_med)

            # Determine the S3 key for the redacted document
            redacted_prefix = os.path.dirname(document).replace('/orig-doc','/redacted-doc')
            s3_redacted_key = f"{redacted_prefix}/{filename}"

            # Upload the redacted document to S3 and clean up temporary files
            if redacted_file and os.path.exists(redacted_file):
                logger.debug(f"Redaction complete. Saving {redacted_file} to S3")
                s3.upload_file(source_file=redacted_file, destination_object=s3_redacted_key, ExtraArgs={'ContentType': file_mime})
                
                # Clean up temporary files and optionally delete original document
                if clean_up(local_paths=[temp_file, redacted_file], s3_keys=[document], s3_retain_docs=retain_docs, s3=s3):
                    logger.info("Cleanup complete...")
            else:
                logger.error(f"Redaction un-successful for file {document}. See logs for more details.")
        except Exception as e:
            logger.error(f"Error occured in redacting {doc['doc']}")
            logger.error(e)

    return dict(status="done")
  