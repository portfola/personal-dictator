import boto3, os, uuid
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.getenv("DYNAMODB_TABLE", "personal-dictator-documents")
REGION = os.getenv("AWS_REGION_NAME", "us-east-1")

def get_table():
    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    return dynamodb.Table(TABLE_NAME)


# --- Documents ---

def create_document(title: str, filename: str, source: str, s3_key: str) -> dict:
    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "pk": f"DOC#{doc_id}",
        "sk": "META",
        "gsi1pk": "DOC",
        "gsi1sk": now,
        "id": doc_id,
        "title": title,
        "filename": filename,
        "source": source,
        "s3_key": s3_key,
        "summary": None,
        "created_at": now,
        "updated_at": now,
    }
    get_table().put_item(Item=item)
    return item

def get_document(doc_id: str) -> dict | None:
    response = get_table().get_item(Key={"pk": f"DOC#{doc_id}", "sk": "META"})
    return response.get("Item")

def list_documents() -> list[dict]:
    response = get_table().query(
        IndexName="type-updatedAt-index",
        KeyConditionExpression=Key("gsi1pk").eq("DOC"),
        ScanIndexForward=False,  # newest first
    )
    return response.get("Items", [])

def update_summary(doc_id: str, summary: str):
    get_table().update_item(
        Key={"pk": f"DOC#{doc_id}", "sk": "META"},
        UpdateExpression="SET summary = :s, updated_at = :u",
        ExpressionAttributeValues={
            ":s": summary,
            ":u": datetime.now(timezone.utc).isoformat(),
        },
    )

def delete_document(doc_id: str):
    get_table().delete_item(Key={"pk": f"DOC#{doc_id}", "sk": "META"})


# --- Messages ---

def add_message(session_id: str, doc_id: str, role: str, content: str, mode: str) -> dict:
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "pk": f"SESSION#{session_id}",
        "sk": f"MSG#{now}#{msg_id}",
        "gsi1pk": "MSG",
        "gsi1sk": now,
        "id": msg_id,
        "doc_id": doc_id,
        "role": role,
        "content": content,
        "mode": mode,
        "created_at": now,
    }
    get_table().put_item(Item=item)
    return item

def get_messages(session_id: str) -> list[dict]:
    response = get_table().query(
        KeyConditionExpression=Key("pk").eq(f"SESSION#{session_id}") & Key("sk").begins_with("MSG#"),
        ScanIndexForward=True,
    )
    return response.get("Items", [])
