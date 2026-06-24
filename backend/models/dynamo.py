import boto3, os, uuid
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key, Attr

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
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    get_table().put_item(Item=item)
    return item

def get_document(doc_id: str, include_deleted: bool = False) -> dict | None:
    response = get_table().get_item(Key={"pk": f"DOC#{doc_id}", "sk": "META"})
    item = response.get("Item")
    # A soft-deleted doc reads as gone to everything except the delete path itself,
    # which passes include_deleted=True so it can still reach the s3_key to reap.
    if item and not include_deleted and item.get("status") == "deleted":
        return None
    return item

def list_documents() -> list[dict]:
    # Hide soft-deleted docs. `ne` also matches items with no status attribute
    # (pre-soft-delete records), so existing active docs stay visible.
    response = get_table().query(
        IndexName="type-updatedAt-index",
        KeyConditionExpression=Key("gsi1pk").eq("DOC"),
        FilterExpression=Attr("status").ne("deleted"),
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

def mark_document_deleted(doc_id: str):
    # Soft delete: flip status to "deleted". Durable and idempotent, it hides the
    # doc from list_documents/get_document immediately while preserving the record
    # (and its s3_key) so the S3 object stays traceable until purge confirms it gone.
    # `status` is a DynamoDB reserved word, hence the #status name placeholder.
    get_table().update_item(
        Key={"pk": f"DOC#{doc_id}", "sk": "META"},
        UpdateExpression="SET #status = :s, updated_at = :u",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={
            ":s": "deleted",
            ":u": datetime.now(timezone.utc).isoformat(),
        },
    )

def purge_document(doc_id: str):
    # The doc's META item and all its chat messages share the DOC#{id} partition,
    # so one query collects everything to remove. Paginate in case a long
    # conversation spills past a single 1 MB query page.
    table = get_table()
    key = {"pk": f"DOC#{doc_id}"}
    kwargs = {
        "KeyConditionExpression": Key("pk").eq(key["pk"]),
        "ProjectionExpression": "pk, sk",
    }
    items = []
    while True:
        page = table.query(**kwargs)
        items.extend(page.get("Items", []))
        if "LastEvaluatedKey" not in page:
            break
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]

    with table.batch_writer() as batch:
        for it in items:
            batch.delete_item(Key={"pk": it["pk"], "sk": it["sk"]})


# --- Messages ---

def add_message(session_id: str, doc_id: str, role: str, content: str, mode: str) -> dict:
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    # Messages live in their document's partition (DOC#{id}) so a single query
    # gathers a doc + all its chats — see delete_document. The session_id leads the
    # sort key so one conversation is still readable by prefix (get_messages), and
    # the trailing timestamp keeps that prefix in chronological order.
    item = {
        "pk": f"DOC#{doc_id}",
        "sk": f"MSG#{session_id}#{now}#{msg_id}",
        "id": msg_id,
        "doc_id": doc_id,
        "session_id": session_id,
        "role": role,
        "content": content,
        "mode": mode,
        "created_at": now,
    }
    get_table().put_item(Item=item)
    return item

def get_messages(doc_id: str, session_id: str) -> list[dict]:
    response = get_table().query(
        KeyConditionExpression=Key("pk").eq(f"DOC#{doc_id}")
        & Key("sk").begins_with(f"MSG#{session_id}#"),
        ScanIndexForward=True,
    )
    return response.get("Items", [])
