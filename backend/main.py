from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from routes.library import router as library_router
from routes.actions import router as actions_router

app = FastAPI(title="Personal Dictator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(library_router)
app.include_router(actions_router)

@app.get("/api/health")
def health():
    return {"status": "ok"}

# Lambda entry point
handler = Mangum(app, lifespan="off")
